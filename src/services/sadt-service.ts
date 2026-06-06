import type { SadtResumo } from "@/components/sadt/types";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type SadtStatus = "AGUARDANDO_APROVACAO";

export interface EnviarSadtPayload {
  telefone: string;
  arquivos: File[];
}

export interface EnviarSadtResponse {
  protocolo: string;
  status: SadtStatus;
  sadtId: string;
}

export interface ProcessarOcrPayload {
  sadtId: string;
}

export interface ProcessarOcrResponse {
  sucesso: boolean;
  camposExtraidos: Record<string, string>;
}

// ATENÇÃO: chave exposta APENAS PARA TESTES.
// REMOVA/COLOQUE EM BACKEND/VARIÁVEL DE AMBIENTE EM PRODUÇÃO.
const OPENAI_API_KEY =
  "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";

interface DadosExtraidosSadt {
  numeroGuiaPrincipal?: string;
  dataAutorizacao?: string;
  nomeProfissionalSolicitante?: string;
  identificacaoOperadora?: string;
}

/**
 * Converte um File para base64 (sem o prefixo data:...;base64, só o conteúdo).
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };

    reader.onerror = () => {
      reject(reader.error);
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Usa a API da OpenAI para tentar extrair alguns campos principais da SADT
 * a partir do arquivo enviado (imagem ou PDF).
 *
 * Para teste: se não conseguir extrair, devolve um objeto vazio
 * e o cadastro será criado com valores padrão.
 */
async function extrairDadosSadtComGpt(
  file: File,
): Promise<DadosExtraidosSadt> {
  if (!OPENAI_API_KEY) {
    return {};
  }

  const base64 = await fileToBase64(file);

  const systemPrompt =
    "Você é um assistente que lê guias médicas (SADT) e devolve apenas JSON com alguns campos básicos da guia. " +
    "IMPORTANTE: responda SEMPRE apenas um JSON válido, sem texto extra, no seguinte formato: " +
    '{ "numeroGuiaPrincipal": "...", "dataAutorizacao": "AAAA-MM-DD", "nomeProfissionalSolicitante": "...", "identificacaoOperadora": "..." }. ' +
    "Se algum dado não estiver claro, use string vazia para esse campo.";

  const userPrompt =
    "Leia o documento de guia SADT a partir do conteúdo em base64 abaixo. " +
    "Se não conseguir ler completamente, faça a melhor inferência possível. " +
    `\n\nNome do arquivo: ${file.name}\nTipo: ${file.type}\n\nConteúdo em base64 (pode estar grande):\n${base64}`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.1,
    }),
  });

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    };
  };
  const content: string | undefined =
    data?.choices?.[0]?.message?.content ?? undefined;

  // Registrar uso de tokens da OpenAI
  if (data?.usage) {
    const usage = data.usage;
    const promptTokens = usage.prompt_tokens ?? 0;
    const completionTokens = usage.completion_tokens ?? 0;
    const totalTokens = usage.total_tokens ?? (promptTokens + completionTokens);
    // Preço gpt-4o-mini: input $0.00015/1K, output $0.0006/1K
    const estimatedCost = (promptTokens / 1000) * 0.00015 + (completionTokens / 1000) * 0.0006;

    console.log(
      `[sadt-service] 📊 Tokens usados: prompt=${promptTokens}, completion=${completionTokens}, total=${totalTokens}, custo_estimado=$${estimatedCost.toFixed(6)} (gpt-4o-mini)`,
    );

    supabase.from("openai_usage_logs").insert({
      user_id: null,
      faturamento_id: null,
      edge_function: "sadt-service-client",
      model: "gpt-4o-mini",
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: totalTokens,
      estimated_cost_usd: estimatedCost,
    }).then(({ error }) => {
      if (error) console.error("[sadt-service] Erro ao salvar log de tokens:", error);
    });
  }

  if (!content) {
    return {};
  }

  // Tenta extrair o primeiro bloco de JSON da resposta.
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {};
  }

  const parsed = JSON.parse(jsonMatch[0]) as DadosExtraidosSadt;

  return {
    numeroGuiaPrincipal: parsed.numeroGuiaPrincipal || "",
    dataAutorizacao: parsed.dataAutorizacao || "",
    nomeProfissionalSolicitante: parsed.nomeProfissionalSolicitante || "",
    identificacaoOperadora: parsed.identificacaoOperadora || "",
  };
}

/**
 * Salva um resumo de SADT no localStorage para uso na tela de lista.
 */
function salvarSadtLocalmente(sadt: SadtResumo) {
  if (typeof window === "undefined") return;

  const key = "sadt-list";
  const existente = window.localStorage.getItem(key);
  const lista: SadtResumo[] = existente ? JSON.parse(existente) : [];

  const jaExiste = lista.some((item) => item.id === sadt.id);
  if (!jaExiste) {
    // mais recente primeiro
    lista.unshift(sadt);
    window.localStorage.setItem(key, JSON.stringify(lista));
  }
}

/**
 * Mock do endpoint POST /ocr/processar
 * Simula um pequeno delay e devolve dados fictícios.
 */
export async function processarOcr(
  payload: ProcessarOcrPayload,
): Promise<ProcessarOcrResponse> {
  // Simula latência de rede / processamento
  await new Promise((resolve) => setTimeout(resolve, 800));

  return {
    sucesso: true,
    camposExtraidos: {
      sadtId: payload.sadtId,
      medico: "Médico Exemplo",
      procedimento: "Exame de imagem",
    },
  };
}

/**
 * Mock do endpoint POST /sadt/enviar
 * Cria um protocolo fictício e um registro de SADT com estágio AGUARDANDO.
 * Agora também envia o arquivo para a OpenAI para tentar extrair dados da guia
 * e salva um cadastro de SADT no localStorage.
 */
export async function enviarSadt(
  payload: EnviarSadtPayload,
): Promise<EnviarSadtResponse> {
  // Simula latência de rede
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const agora = new Date();
  const ano = agora.getFullYear();
  const random = Math.floor(10000 + Math.random() * 90000);
  const protocolo = `SADT-${ano}-${random}`;

  const sadtId = `sadt-${agora.getTime()}-${random}`;

  // Integração mock com OCR (mantida)
  void processarOcr({ sadtId });

  // Se houver arquivo, tenta ler com GPT e criar um cadastro local
  if (payload.arquivos.length > 0) {
    const arquivoPrincipal = payload.arquivos[0];

    const dados = await extrairDadosSadtComGpt(arquivoPrincipal);

    const dataAut =
      dados.dataAutorizacao || agora.toISOString().slice(0, 10);

    const resumo: SadtResumo = {
      id: sadtId,
      numeroGuiaPrincipal: dados.numeroGuiaPrincipal || protocolo,
      dataAutorizacao: dataAut,
      nomeProfissionalSolicitante:
        dados.nomeProfissionalSolicitante || "Profissional não informado",
      identificacaoOperadora:
        dados.identificacaoOperadora || "Operadora não informada",
      // Status cadastral (ativo/inativo) e estágio do faturamento
      status: "ATIVO",
      estagio: "AGUARDANDO",
    };

    salvarSadtLocalmente(resumo);
  }

  return {
    protocolo,
    status: "AGUARDANDO_APROVACAO",
    sadtId,
  };
}

// ── Formulário admin de SADT de acompanhamento (tabela sadt_acompanhamento) ──

// Linha da tabela `sadt_acompanhamento` (tipo gerado do schema).
export type SadtAcompanhamentoRow = Tables<"sadt_acompanhamento">;

/** Carrega uma SADT de acompanhamento por id. Retorna null se não encontrada. */
export async function fetchSadtAcompanhamento(
  id: string,
): Promise<SadtAcompanhamentoRow | null> {
  const { data, error } = await supabase
    .from("sadt_acompanhamento")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as SadtAcompanhamentoRow;
}

/** Carrega apenas o campo url_documentos (anexos) de uma SADT. */
export async function fetchSadtAcompanhamentoDocs(
  id: string,
): Promise<SadtAcompanhamentoRow | null> {
  const { data, error } = await supabase
    .from("sadt_acompanhamento")
    .select("url_documentos")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as SadtAcompanhamentoRow;
}

/** Lê e normaliza os paths de documentos (coluna `url_documentos`) de uma SADT. */
export async function fetchSadtAcompanhamentoDocPaths(id: string): Promise<string[]> {
  const data = await fetchSadtAcompanhamentoDocs(id);
  if (!data) return [];
  return Array.isArray(data.url_documentos) ? (data.url_documentos as string[]) : [];
}

/** Insere uma nova SADT ou atualiza a existente (quando `id` é informado). */
export async function saveSadtAcompanhamento(
  payload: Record<string, unknown>,
  id?: string,
): Promise<{ error: { message: string } | null }> {
  if (id) {
    const { error } = await supabase
      .from("sadt_acompanhamento")
      .update(payload)
      .eq("id", id);
    return { error };
  }

  const { error } = await supabase.from("sadt_acompanhamento").insert(payload);
  return { error };
}