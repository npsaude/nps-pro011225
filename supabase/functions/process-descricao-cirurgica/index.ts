// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  validarProcedimentoCbhpm,
  calcularScoreCombinado,
} from "../_shared/cbhpm-validator.ts";
import { logOpenAIUsage } from "../_shared/openai-usage-logger.ts";
import { imageUrlsToBase64 } from "../_shared/image-to-base64.ts";
import { openaiChatWithImages, extractJson } from "../_shared/openai-chat.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

function normalizeDate(value: unknown): string | null {
  if (!value) return null;
  const s = String(value).trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const match = s.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (match) {
    const [, dd, mm, yyyy] = match;
    return `${yyyy}-${mm}-${dd}`;
  }
  console.warn("[process-descricao-cirurgica] normalizeDate: formato desconhecido:", s);
  return null;
}

function normalizeTime(value: unknown): string | null {
  if (!value) return null;
  const s = String(value).trim();
  if (!s) return null;
  const match = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (match) {
    const [, hh, mm, ss] = match;
    return `${hh.padStart(2, "0")}:${mm.padStart(2, "0")}:${(ss ?? "00").padStart(2, "0")}`;
  }
  console.warn("[process-descricao-cirurgica] normalizeTime: formato desconhecido:", s);
  return null;
}

function normalizeCpf(value: unknown): string | null {
  if (value == null) return null;
  const digits = String(value).replace(/\D/g, "");
  return digits.length === 11 ? digits : null;
}

function normalizeGuideNumber(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s ? s.replace(/\s+/g, "") : null;
}

interface UploadedFile { path: string; }
interface RequestBody { userId: string; faturamentoId: string; files: UploadedFile[]; }
interface ProcedimentoPreExistente {
  id: string;
  codigo_procedimento: string | null;
  descricao_procedimento: string | null;
}

// ─── Cria URL assinada e retorna null em caso de erro ────────────────────────
async function signedUrl(supabase: any, path: string): Promise<string | null> {
  const { data } = await supabase.storage.from("NPS-pro").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

serve(async (req) => {
  if (req.method.toUpperCase() === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  console.log("[process-descricao-cirurgica] Iniciando processamento...");

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: "SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  let body: RequestBody;
  try {
    body = JSON.parse(await req.text()) as RequestBody;
  } catch {
    return new Response(JSON.stringify({ error: "Body JSON inválido." }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { userId, faturamentoId, files } = body;

  console.log("[process-descricao-cirurgica] userId:", userId);
  console.log("[process-descricao-cirurgica] faturamentoId:", faturamentoId);
  console.log("[process-descricao-cirurgica] files:", files?.length);

  if (!userId || !faturamentoId || !files?.length) {
    return new Response(JSON.stringify({ error: "Parâmetros obrigatórios: userId, faturamentoId e files." }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── 1) Configurações OpenAI ──────────────────────────────────────────────────
  const { data: settings, error: settingsError } = await supabase
    .from("app_settings").select("openai_api_token, openai_model").limit(1).maybeSingle();

  if (settingsError) {
    return new Response(JSON.stringify({ error: "Erro ao carregar configurações da aplicação." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const openaiToken = (settings as any)?.openai_api_token ?? (settings as any)?.openaiApiToken;
  const openaiModel = (settings as any)?.openai_model ?? (settings as any)?.openaiModel ?? "gpt-4o";

  if (!openaiToken) {
    return new Response(JSON.stringify({ error: "Token da OpenAI não configurado em app_settings." }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── 2) Converter imagens do documento para base64 ────────────────────────────
  const docSignedUrls: string[] = [];
  for (const file of files) {
    if (!file.path) continue;
    const { data, error } = await supabase.storage.from("NPS-pro").createSignedUrl(file.path, 3600);
    if (!error && data?.signedUrl) docSignedUrls.push(data.signedUrl);
    else console.error("[process-descricao-cirurgica] Erro ao assinar URL:", file.path, error);
  }

  if (!docSignedUrls.length) {
    return new Response(JSON.stringify({ error: "Não foi possível criar URLs assinadas para os arquivos." }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const docImageUrls = docSignedUrls.filter(u => /\.(png|jpe?g|gif|webp)(\?|$)/i.test(u));
  if (!docImageUrls.length) {
    return new Response(JSON.stringify({ error: "Nenhuma imagem válida encontrada. Envie PNG, JPEG, GIF ou WEBP." }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log("[process-descricao-cirurgica] Convertendo", docImageUrls.length, "imagens do documento...");
  const docBase64List = await imageUrlsToBase64(docImageUrls);

  if (!docBase64List.length) {
    return new Response(JSON.stringify({ error: "Não foi possível processar as imagens enviadas." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  console.log("[process-descricao-cirurgica] Imagens do documento convertidas:", docBase64List.length);

  // ── 3) Buscar procedimentos pré-existentes (guia de autorização/solicitação) ──
  const { data: existingItemsRaw } = await supabase
    .from("itens_faturamento")
    .select("id, codigo_procedimento, descricao_procedimento")
    .eq("faturamento_id", faturamentoId);

  const existingItemsList: ProcedimentoPreExistente[] = (existingItemsRaw || []) as ProcedimentoPreExistente[];
  const temItensPreExistentes = existingItemsList.length > 0;

  console.log("[process-descricao-cirurgica] Itens pré-existentes:", existingItemsList.length);

  let procedimentosAutorizadosParaIA: Array<{ codigo: string; descricao: string }> = [];
  if (temItensPreExistentes) {
    const codigosPreExistentes = existingItemsList.map(i => i.codigo_procedimento).filter(Boolean) as string[];
    if (codigosPreExistentes.length > 0) {
      const { data: cbhpmData } = await supabase.from("cbhpm_cirurgias").select("codigo, descricao").in("codigo", codigosPreExistentes);
      for (const item of existingItemsList) {
        if (!item.codigo_procedimento) continue;
        const cbhpmMatch = (cbhpmData || []).find((c: any) => c.codigo === item.codigo_procedimento);
        procedimentosAutorizadosParaIA.push({
          codigo: item.codigo_procedimento,
          descricao: cbhpmMatch?.descricao || item.descricao_procedimento || "",
        });
      }
    } else {
      for (const item of existingItemsList) {
        if (item.descricao_procedimento) {
          procedimentosAutorizadosParaIA.push({ codigo: "", descricao: item.descricao_procedimento });
        }
      }
    }
    console.log("[process-descricao-cirurgica] Procedimentos autorizados para contexto:", JSON.stringify(procedimentosAutorizadosParaIA));
  }

  // ── 4) Identificar modelo de descrição cirúrgica pelo nome do hospital/clínica ──
  //
  // ESTRATÉGIA (sem chamada visual extra cara):
  //
  //   PASSO 1 — Leitura rápida do hospital:
  //     Envia apenas as imagens do documento para a IA com um prompt mínimo,
  //     pedindo somente o nome do hospital/clínica. Custo: ~100 tokens de saída.
  //
  //   PASSO 2 — Busca no banco por nome:
  //     Compara o nome lido com os campos `nome` de modelos_descricao_cirurgica
  //     usando ILIKE (busca parcial, case-insensitive). Sem custo de IA.
  //
  //   PASSO 3 — Uso do modelo encontrado:
  //     Se encontrou modelo → injeta instrucao_ia no prompt principal e carrega
  //     imagem_destaque_path como referência visual de onde ficam os procedimentos.
  //
  //   Se não houver modelos cadastrados ou o hospital não bater com nenhum nome,
  //   o processamento continua normalmente sem contexto de modelo.

  let modeloIdentificado: {
    id: string;
    nome: string;
    instrucao_ia: string | null;
    imagem_destaque_path: string | null;
  } | null = null;

  let destaqueBase64List: Array<{ base64: string; mimeType: string }> = [];

  try {
    // Verificar se há algum modelo ativo antes de fazer qualquer chamada à IA
    const { data: modelosAtivos, error: modelosError } = await supabase
      .from("modelos_descricao_cirurgica")
      .select("id, nome, instrucao_ia, imagem_destaque_path")
      .eq("ativo", true);

    if (modelosError) {
      console.error("[process-descricao-cirurgica] Erro ao buscar modelos:", modelosError);
    } else if (modelosAtivos && modelosAtivos.length > 0) {
      console.log("[process-descricao-cirurgica] Modelos ativos no banco:", modelosAtivos.length,
        "| Nomes:", (modelosAtivos as any[]).map(m => m.nome).join(", "));

      // ── PASSO 1: Leitura rápida do hospital/clínica ──────────────────────────
      // Prompt mínimo — só queremos o nome do hospital, nada mais.
      const promptHospital = `Leia a imagem e extraia APENAS o nome do hospital ou clínica onde a cirurgia foi realizada.

Procure por: cabeçalho do documento, logotipo, campo "Hospital", "Clínica", "Estabelecimento" ou similar.

Responda SOMENTE com JSON válido:
{
  "hospital": "<nome do hospital ou clínica>" | null
}

Se não encontrar nenhum nome de hospital/clínica, use null.`;

      console.log("[process-descricao-cirurgica] PASSO 1 — Lendo nome do hospital...");

      let nomeHospitalLido: string | null = null;

      try {
        const resultHospital = await openaiChatWithImages({
          apiKey: openaiToken,
          model: openaiModel,
          systemPrompt: "Você é um leitor de documentos médicos. Responda sempre com JSON válido.",
          userText: promptHospital,
          imageBase64List: docBase64List,
          maxTokens: 80,
        });

        const hospitalJson = extractJson(resultHospital.content);
        nomeHospitalLido = hospitalJson?.hospital ?? null;
        console.log("[process-descricao-cirurgica] Hospital lido pela IA:", nomeHospitalLido);
      } catch (hospErr) {
        console.error("[process-descricao-cirurgica] Erro ao ler hospital:", hospErr);
      }

      // ── PASSO 2: Busca no banco por nome (ILIKE parcial) ─────────────────────
      if (nomeHospitalLido) {
        // Extrair palavras significativas do nome lido (≥4 letras) para busca parcial
        const palavrasChave = nomeHospitalLido
          .split(/\s+/)
          .map(p => p.replace(/[^a-zA-ZÀ-ÿ0-9]/g, ""))
          .filter(p => p.length >= 4);

        console.log("[process-descricao-cirurgica] PASSO 2 — Buscando modelo por palavras-chave:", palavrasChave);

        // Tentar match direto primeiro (nome do modelo contém o hospital lido)
        let modeloEncontrado: any = null;

        for (const modelo of modelosAtivos as any[]) {
          const nomeModeloNorm = modelo.nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          const nomeHospitalNorm = nomeHospitalLido.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

          // Verificar se o nome do modelo contém o hospital ou vice-versa
          if (
            nomeModeloNorm.includes(nomeHospitalNorm) ||
            nomeHospitalNorm.includes(nomeModeloNorm)
          ) {
            modeloEncontrado = modelo;
            console.log(`[process-descricao-cirurgica] ✅ Match direto: modelo "${modelo.nome}" ↔ hospital "${nomeHospitalLido}"`);
            break;
          }

          // Verificar por palavras-chave: se ≥50% das palavras batem
          if (palavrasChave.length > 0) {
            const palavrasBatendo = palavrasChave.filter(p =>
              nomeModeloNorm.includes(p.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))
            );
            const taxaMatch = palavrasBatendo.length / palavrasChave.length;
            if (taxaMatch >= 0.5) {
              modeloEncontrado = modelo;
              console.log(`[process-descricao-cirurgica] ✅ Match por palavras-chave (${(taxaMatch * 100).toFixed(0)}%): modelo "${modelo.nome}" ↔ hospital "${nomeHospitalLido}"`);
              break;
            }
          }
        }

        if (modeloEncontrado) {
          modeloIdentificado = {
            id: modeloEncontrado.id,
            nome: modeloEncontrado.nome,
            instrucao_ia: modeloEncontrado.instrucao_ia ?? null,
            imagem_destaque_path: modeloEncontrado.imagem_destaque_path ?? null,
          };
        } else {
          console.log(`[process-descricao-cirurgica] ⚠️ Nenhum modelo encontrado para o hospital "${nomeHospitalLido}". Prosseguindo sem modelo.`);
        }
      } else {
        console.log("[process-descricao-cirurgica] ⚠️ Hospital não identificado. Prosseguindo sem modelo.");
      }

      // ── PASSO 3: Carregar imagem de destaque do modelo identificado ──────────
      // A imagem_destaque_path é um zoom/recorte do campo de procedimentos.
      // Ela será enviada APÓS as imagens do documento real para que a IA saiba
      // exatamente onde procurar os procedimentos no documento.
      if (modeloIdentificado?.imagem_destaque_path) {
        const urlDestaque = await signedUrl(supabase, modeloIdentificado.imagem_destaque_path);
        if (urlDestaque && /\.(png|jpe?g|gif|webp)(\?|$)/i.test(urlDestaque)) {
          console.log("[process-descricao-cirurgica] PASSO 3 — Carregando destaque do modelo:", modeloIdentificado.nome);
          destaqueBase64List = await imageUrlsToBase64([urlDestaque]);
          console.log("[process-descricao-cirurgica] Imagem de destaque:", destaqueBase64List.length > 0 ? "OK" : "FALHOU");
        }
      }

    } else {
      console.log("[process-descricao-cirurgica] Nenhum modelo de descrição ativo. Prosseguindo sem contexto de modelo.");
    }
  } catch (modelosErr) {
    console.error("[process-descricao-cirurgica] Erro ao processar modelos:", modelosErr);
  }

  // ── 5) Montar contexto do modelo identificado para o prompt principal ─────────
  const blocoContextoModelo = modeloIdentificado
    ? `
═══════════════════════════════════════════════════════
📋 MODELO DE DOCUMENTO IDENTIFICADO: "${modeloIdentificado.nome}"
═══════════════════════════════════════════════════════
${modeloIdentificado.instrucao_ia
  ? `INSTRUÇÃO ESPECÍFICA PARA ESTE MODELO:\n${modeloIdentificado.instrucao_ia}\n`
  : "Nenhuma instrução específica cadastrada para este modelo."}
${destaqueBase64List.length > 0
  ? `\nA ÚLTIMA IMAGEM enviada nesta mensagem é o DESTAQUE DO CAMPO DE PROCEDIMENTOS\ndeste modelo — ela mostra exatamente onde ficam os procedimentos no documento.\nUse-a como referência visual para localizar o campo correto no documento real.`
  : ""}
`
    : "";

  // ── 6) Montar contexto de procedimentos autorizados ──────────────────────────
  const blocoContextoAutorizados = temItensPreExistentes && procedimentosAutorizadosParaIA.length > 0
    ? `
═══════════════════════════════════════════════════════
⚠️ PROCEDIMENTOS JÁ AUTORIZADOS (GUIA DE AUTORIZAÇÃO/SOLICITAÇÃO)
═══════════════════════════════════════════════════════
Este faturamento já possui os seguintes procedimentos autorizados:

${procedimentosAutorizadosParaIA.map((p, i) => `  ${i + 1}. Código: ${p.codigo || "N/A"} | Descrição: ${p.descricao}`).join("\n")}

REGRAS OBRIGATÓRIAS:
1. Para documentos NARRATIVOS (sem tabela de códigos):
   - Identifique quais procedimentos da descrição CORRESPONDEM aos autorizados acima
   - Use o MESMO código dos procedimentos autorizados quando houver correspondência
   - NÃO invente novos códigos fora da lista acima
   - Só adicione procedimentos extras se forem claramente distintos e não previstos na autorização

2. Para documentos com TABELA DE CÓDIGOS:
   - Extraia os códigos exatamente como aparecem na tabela
`
    : "";

  // ── 7) Prompt principal de extração ──────────────────────────────────────────
  const jsonFormatInstructions = `
Você é um especialista em faturamento médico hospitalar brasileiro. Analise TODAS as imagens fornecidas e extraia os dados com MÁXIMA PRECISÃO.
${blocoContextoModelo}
${blocoContextoAutorizados}
═══════════════════════════════════════════════════════
REGRAS ABSOLUTAS
═══════════════════════════════════════════════════════
1. Leia TODAS as imagens completamente antes de responder.
2. Extraia TODOS os procedimentos cirúrgicos realizados, sem omitir nenhum.
3. NUNCA truncar ou resumir o array de procedimentos. Retorne TODOS.
4. Use APENAS dados visíveis. Não invente. Se não encontrar, use null.
5. NUNCA invente códigos CBHPM. Se o documento não tiver código, use null.

═══════════════════════════════════════════════════════
DADOS DA EXECUÇÃO (campo "faturamento")
═══════════════════════════════════════════════════════
- paciente_nome: Nome completo do paciente
- data_cirurgia: Data do procedimento (DD/MM/YYYY)
- hora_inicio: Hora de início (HH:MM)
- hora_fim: Hora de término (HH:MM)
- paciente_cpf: CPF do paciente (apenas 11 dígitos numéricos)
- numero_guia_honorarios: Número da guia de honorários
- numero_guia_internacao: Número da guia de internação / registro

DIAGNÓSTICO:
- cid_codigo: Código CID (ex: "M75.1")
- diagnostico_descricao: Diagnóstico pós-operatório ou pré-operatório

═══════════════════════════════════════════════════════
EQUIPE CIRÚRGICA
═══════════════════════════════════════════════════════
Procure a seção "EQUIPE PRESENTE NO ATO OPERATÓRIO" ou "EQUIPE CIRÚRGICA".

- cirurgiao_nome / cirurgiao_crm: linha com rótulo "CIRURGIÃO"
- auxiliar1_nome / auxiliar1_crm: linha com rótulo "1º AUXILIAR"
- auxiliar2_nome / auxiliar2_crm: linha com rótulo "2º AUXILIAR"
- auxiliar3_nome / auxiliar3_crm: linha com rótulo "3º AUXILIAR"
- instrumentador_nome / instrumentador_crm: linha com rótulo "INSTRUMENTADOR" (usa COREN, não CRM)
- anestesista_nome / anestesista_crm: linha com rótulo "ANESTESISTA"
- assinatura_medica: true se há assinatura do médico visível
- data_assinatura: Data da assinatura (DD/MM/YYYY)

═══════════════════════════════════════════════════════
PROCEDIMENTOS CIRÚRGICOS — REGRA CRÍTICA
═══════════════════════════════════════════════════════
Existem DOIS tipos de documento:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TIPO 1 — GUIA COM TABELA DE PROCEDIMENTOS (tem códigos numéricos)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Localize a tabela "PROCEDIMENTOS REALIZADOS" ou "PROCEDIMENTOS CIRÚRGICOS".
Para cada linha da tabela extraia:
- codigo_procedimento: código numérico exatamente como aparece (ex: "30718058")
- descricao_procedimento: descrição completa do procedimento
- quantidade_executada: número da coluna "Quantidade" (use 1 se não informado)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TIPO 2 — BOLETIM OPERATÓRIO / DESCRIÇÃO NARRATIVA (sem tabela de códigos)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FONTE PRIMÁRIA: campo "Descrição detalhada da intervenção" (técnica operatória)
FONTES SECUNDÁRIAS (só se a primária estiver vazia): "Intervenção feita" / "Intervenção indicada"

⚠️ NÃO extraia procedimentos de "Intervenção indicada" se já extraiu da "Descrição detalhada".

Para cada procedimento distinto:
- codigo_procedimento: null (NUNCA invente um código)
- descricao_procedimento: nome técnico em linguagem médica clara e concisa
- quantidade_executada: 1 (ou quantidade mencionada)

INCLUIR (atos cirúrgicos faturáveis):
  ✅ Tratamento cirúrgico de fratura
  ✅ Osteotomias, osteossínteses
  ✅ Tenoplastias, tenorrafias, tenólise
  ✅ Neurólise, microneurólise
  ✅ Controle radioscópico intraoperatório
  ✅ Qualquer procedimento cirúrgico com nome técnico específico

NÃO INCLUIR:
  ❌ Antissepsia / assepsia / posicionamento do paciente
  ❌ Incisão de acesso / divulsão por planos
  ❌ Hemostasia / sutura por planos / curativo
  ❌ Fixação com placa/parafusos quando é PARTE de um tratamento cirúrgico de fratura
  ❌ Exposição de foco de fratura (é etapa do tratamento, não procedimento separado)
  ❌ Redução de fratura quando já existe "tratamento cirúrgico de fratura" do mesmo osso

⚠️ REGRA DE NÃO-FRAGMENTAÇÃO: Não fragmente um único ato cirúrgico complexo em múltiplos procedimentos separados para cada etapa. Extraia apenas procedimentos DISTINTOS e INDEPENDENTES.

═══════════════════════════════════════════════════════
FORMATO DE RESPOSTA — JSON VÁLIDO E COMPLETO
═══════════════════════════════════════════════════════
Responda SOMENTE com JSON válido, sem texto adicional, sem markdown:

{
  "faturamento": {
    "paciente_nome": string | null,
    "data_cirurgia": string | null,
    "hora_inicio": string | null,
    "hora_fim": string | null,
    "paciente_cpf": string | null,
    "numero_guia_honorarios": string | null,
    "numero_guia_internacao": string | null,
    "cid_codigo": string | null,
    "diagnostico_descricao": string | null,
    "cirurgiao_nome": string | null,
    "cirurgiao_crm": string | null,
    "auxiliar1_nome": string | null,
    "auxiliar1_crm": string | null,
    "auxiliar2_nome": string | null,
    "auxiliar2_crm": string | null,
    "auxiliar3_nome": string | null,
    "auxiliar3_crm": string | null,
    "anestesista_nome": string | null,
    "anestesista_crm": string | null,
    "instrumentador_nome": string | null,
    "instrumentador_crm": string | null,
    "assinatura_medica": boolean | null,
    "data_assinatura": string | null
  },
  "procedimentos": [
    {
      "codigo_procedimento": string | null,
      "descricao_procedimento": string | null,
      "quantidade_executada": number | null
    }
  ]
}
`;

  // ── 8) Chamar OpenAI para extração principal ──────────────────────────────────
  // Ordem das imagens: [doc_real_1, doc_real_2, ..., destaque_modelo (se houver)]
  // A imagem de destaque vem por ÚLTIMO para que a IA a use como referência visual
  // de "onde procurar" no documento real.
  const allImagesForExtraction = [...docBase64List, ...destaqueBase64List];

  console.log("[process-descricao-cirurgica] Chamando OpenAI modelo:", openaiModel);
  console.log("[process-descricao-cirurgica] Total de imagens para extração:", allImagesForExtraction.length,
    `(${docBase64List.length} doc + ${destaqueBase64List.length} destaque)`);
  if (modeloIdentificado) {
    console.log("[process-descricao-cirurgica] Modelo em uso:", modeloIdentificado.nome,
      "| instrucao_ia:", modeloIdentificado.instrucao_ia ? "SIM" : "NÃO",
      "| destaque:", destaqueBase64List.length > 0 ? "SIM" : "NÃO");
  }

  let messageContent: string;
  let openaiUsage: any;

  try {
    const result = await openaiChatWithImages({
      apiKey: openaiToken,
      model: openaiModel,
      systemPrompt:
        "Você é um assistente de IA especializado em leitura de descrições cirúrgicas e faturamento médico hospitalar brasileiro. " +
        "Sua principal responsabilidade é extrair TODOS os procedimentos cirúrgicos listados no documento, sem omitir nenhum. " +
        "NUNCA invente códigos CBHPM — se o documento não tiver código, use null. " +
        "Sempre responda com JSON válido e completo.",
      userText: jsonFormatInstructions,
      imageBase64List: allImagesForExtraction,
      maxTokens: 4096,
    });
    messageContent = result.content;
    openaiUsage = result.usage;
  } catch (openaiErr) {
    console.error("[process-descricao-cirurgica] Erro da OpenAI:", openaiErr);
    return new Response(JSON.stringify({ error: "Erro ao chamar a API da OpenAI.", details: String(openaiErr) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  await logOpenAIUsage({
    supabase, userId, faturamentoId,
    edgeFunction: "process-descricao-cirurgica",
    model: openaiModel, usage: openaiUsage,
  });

  if (!messageContent) {
    return new Response(JSON.stringify({ error: "Resposta da OpenAI sem conteúdo utilizável." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let parsed: any;
  try {
    parsed = extractJson(messageContent);
  } catch (e) {
    console.error("[process-descricao-cirurgica] Falha ao parsear JSON da OpenAI:", e, messageContent);
    return new Response(JSON.stringify({ error: "Falha ao interpretar a resposta da OpenAI como JSON." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log("[process-descricao-cirurgica] Resposta parseada:", JSON.stringify(parsed).slice(0, 2000));

  const faturamentoData = parsed?.faturamento ?? {};
  const procedimentosData = Array.isArray(parsed?.procedimentos) ? parsed.procedimentos : [];

  console.log("[process-descricao-cirurgica] Procedimentos extraídos:", procedimentosData.length,
    "| Lista:", JSON.stringify(procedimentosData.map((p: any) => ({ cod: p.codigo_procedimento, desc: p.descricao_procedimento?.slice(0, 40) }))));

  // ── 9) Atualizar faturamento com dados extraídos ──────────────────────────────
  const filePaths = files.map(f => f.path);
  const updateData: Record<string, unknown> = {
    url_descricao_cirurgica: filePaths,
    quantidade_procedimentos_realizados: procedimentosData.length,
    updated_at: new Date().toISOString(),
  };

  if (faturamentoData.paciente_nome) updateData.paciente_nome = faturamentoData.paciente_nome;
  const dataCirurgia = normalizeDate(faturamentoData.data_cirurgia);
  if (dataCirurgia) updateData.data_cirurgia = dataCirurgia;
  const horaInicio = normalizeTime(faturamentoData.hora_inicio);
  if (horaInicio) updateData.hora_inicio = horaInicio;
  const horaFim = normalizeTime(faturamentoData.hora_fim);
  if (horaFim) updateData.hora_fim = horaFim;
  const pacienteCpf = normalizeCpf(faturamentoData.paciente_cpf);
  if (pacienteCpf) updateData.paciente_cpf = pacienteCpf;
  const numeroGuiaHonorarios = normalizeGuideNumber(faturamentoData.numero_guia_honorarios);
  if (numeroGuiaHonorarios) updateData.numero_guia_honorarios = numeroGuiaHonorarios;
  const numeroGuiaInternacao = normalizeGuideNumber(faturamentoData.numero_guia_internacao);
  if (numeroGuiaInternacao) updateData.numero_guia_internacao = numeroGuiaInternacao;
  if (faturamentoData.cid_codigo) updateData.diagnostico_cid = faturamentoData.cid_codigo;
  if (faturamentoData.diagnostico_descricao) updateData.diagnostico_descricao = faturamentoData.diagnostico_descricao;
  if (faturamentoData.cirurgiao_nome) updateData.cirurgiao_principal_nome = faturamentoData.cirurgiao_nome;
  if (faturamentoData.cirurgiao_crm) updateData.cirurgiao_principal_crm = faturamentoData.cirurgiao_crm;
  if (faturamentoData.auxiliar1_nome) updateData.auxiliar1_nome = faturamentoData.auxiliar1_nome;
  if (faturamentoData.auxiliar1_crm) updateData.auxiliar1_crm = faturamentoData.auxiliar1_crm;
  if (faturamentoData.auxiliar2_nome) updateData.auxiliar2_nome = faturamentoData.auxiliar2_nome;
  if (faturamentoData.auxiliar2_crm) updateData.auxiliar2_crm = faturamentoData.auxiliar2_crm;
  if (faturamentoData.auxiliar3_nome) updateData.auxiliar3_nome = faturamentoData.auxiliar3_nome;
  if (faturamentoData.auxiliar3_crm) updateData.auxiliar3_crm = faturamentoData.auxiliar3_crm;
  if (faturamentoData.anestesista_nome) updateData.anestesista_nome = faturamentoData.anestesista_nome;
  if (faturamentoData.anestesista_crm) updateData.anestesista_crm = faturamentoData.anestesista_crm;
  if (faturamentoData.instrumentador_nome) updateData.instrumentador_nome = faturamentoData.instrumentador_nome;
  if (faturamentoData.instrumentador_crm) updateData.instrumentador_crm = faturamentoData.instrumentador_crm;
  if (faturamentoData.assinatura_medica != null) updateData.assinatura_medica = Boolean(faturamentoData.assinatura_medica);
  const dataAssinatura = normalizeDate(faturamentoData.data_assinatura);
  if (dataAssinatura) updateData.data_assinatura = dataAssinatura;

  console.log("[process-descricao-cirurgica] Atualizando faturamento:", faturamentoId);

  const { error: updateError } = await supabase.from("faturamentos").update(updateData).eq("id", faturamentoId);
  if (updateError) {
    console.error("[process-descricao-cirurgica] Erro ao atualizar faturamento:", updateError);
    return new Response(JSON.stringify({ error: "Erro ao atualizar o faturamento no banco.", details: updateError.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── 9.1) Reconhecer atuação do médico logado ──────────────────────────────────
  try {
    const { data: usuarioData } = await supabase
      .from("usuarios_sistema").select("nome, crm").eq("id_user", userId).maybeSingle();

    const userNome = usuarioData?.nome ?? "";
    const userCrm = usuarioData?.crm ? String(usuarioData.crm) : "";

    if (userNome || userCrm) {
      const normalizeDigits = (s: string) => String(s ?? "").replace(/\D/g, "");
      const normalizeTextLocal = (s: string) =>
        String(s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
      const cleanToken = (s: string) => normalizeTextLocal(s).replace(/[^a-z0-9]/g, "");
      const firstNameFn = (input: string): string => {
        const parts = normalizeTextLocal(input).split(" ").filter(Boolean);
        if (!parts.length) return "";
        const first = cleanToken(parts[0]);
        return ["dr", "dra", "doutor", "doutora"].includes(first) ? cleanToken(parts[1] ?? "") : first;
      };
      const lastNameFn = (input: string): string => {
        const parts = normalizeTextLocal(input).split(" ").filter(Boolean);
        return parts.length <= 1 ? "" : cleanToken(parts[parts.length - 1]);
      };

      type Atuacao = "CIRURGIAO" | "PRIMEIRO_AUXILIAR" | "SEGUNDO_AUXILIAR" | "TERCEIRO_AUXILIAR" | "ANESTESISTA";
      const candidates: Array<{ atuacao: Atuacao; nome: string | null; crm: string | null }> = [
        { atuacao: "CIRURGIAO", nome: faturamentoData.cirurgiao_nome ?? null, crm: faturamentoData.cirurgiao_crm ?? null },
        { atuacao: "PRIMEIRO_AUXILIAR", nome: faturamentoData.auxiliar1_nome ?? null, crm: faturamentoData.auxiliar1_crm ?? null },
        { atuacao: "SEGUNDO_AUXILIAR", nome: faturamentoData.auxiliar2_nome ?? null, crm: faturamentoData.auxiliar2_crm ?? null },
        { atuacao: "TERCEIRO_AUXILIAR", nome: faturamentoData.auxiliar3_nome ?? null, crm: faturamentoData.auxiliar3_crm ?? null },
        { atuacao: "ANESTESISTA", nome: faturamentoData.anestesista_nome ?? null, crm: faturamentoData.anestesista_crm ?? null },
      ];

      const crmUser = normalizeDigits(userCrm);
      let atuacaoReconhecida: Atuacao | null = null;

      if (crmUser) {
        for (const c of candidates) {
          const crmC = normalizeDigits(c.crm ?? "");
          if (crmC && (crmC === crmUser || crmC.includes(crmUser) || crmUser.includes(crmC))) {
            atuacaoReconhecida = c.atuacao;
            console.log(`[process-descricao-cirurgica] ✅ Match por CRM! ${c.atuacao}`);
            break;
          }
        }
      }

      if (!atuacaoReconhecida && userNome) {
        const userFirst = firstNameFn(userNome);
        const userLast = lastNameFn(userNome);
        for (const c of candidates) {
          if (!c.nome) continue;
          if (userFirst && firstNameFn(c.nome) === userFirst) {
            atuacaoReconhecida = c.atuacao;
            console.log(`[process-descricao-cirurgica] ✅ Match por primeiro nome! ${c.atuacao}`);
            break;
          }
          if (userLast && lastNameFn(c.nome) === userLast) {
            atuacaoReconhecida = c.atuacao;
            console.log(`[process-descricao-cirurgica] ✅ Match por último nome! ${c.atuacao}`);
            break;
          }
        }
      }

      if (!atuacaoReconhecida && userNome) {
        const userNomeNorm = normalizeTextLocal(userNome);
        for (const c of candidates) {
          if (!c.nome) continue;
          const cNorm = normalizeTextLocal(c.nome);
          if (cNorm && (cNorm.includes(userNomeNorm) || userNomeNorm.includes(cNorm))) {
            atuacaoReconhecida = c.atuacao;
            console.log(`[process-descricao-cirurgica] ✅ Match por substring! ${c.atuacao}`);
            break;
          }
          for (const word of userNomeNorm.split(" ").filter(w => w.length >= 4)) {
            if (cNorm.includes(word)) {
              atuacaoReconhecida = c.atuacao;
              console.log(`[process-descricao-cirurgica] ✅ Match por palavra "${word}"! ${c.atuacao}`);
              break;
            }
          }
          if (atuacaoReconhecida) break;
        }
      }

      if (atuacaoReconhecida) {
        const { error: atuacaoError } = await supabase.from("faturamentos")
          .update({ atuou_como: atuacaoReconhecida, updated_at: new Date().toISOString() })
          .eq("id", faturamentoId);
        if (atuacaoError) console.error("[process-descricao-cirurgica] Erro ao salvar atuou_como:", atuacaoError);
        else console.log("[process-descricao-cirurgica] atuou_como salvo:", atuacaoReconhecida);
      }
    }
  } catch (atuacaoErr) {
    console.error("[process-descricao-cirurgica] Erro ao reconhecer atuação:", atuacaoErr);
  }

  // ── 10) Processar procedimentos com validação CBHPM ───────────────────────────
  if (!procedimentosData.length) {
    console.log("[process-descricao-cirurgica] Concluído sem procedimentos.");
    return new Response(JSON.stringify({
      success: true, faturamento_id: faturamentoId,
      dados_extraidos: { faturamento: faturamentoData, procedimentos: [] },
      revisao_procedimentos: [], tem_revisao_pendente: false,
      modelo_utilizado: modeloIdentificado?.nome ?? null,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  console.log("[process-descricao-cirurgica] Processando", procedimentosData.length, "procedimentos...");

  const { data: faturamentoInfo } = await supabase.from("faturamentos").select("medico_id").eq("id", faturamentoId).single();
  const medicoId = faturamentoInfo?.medico_id ?? userId;

  const { data: currentItems } = await supabase.from("itens_faturamento")
    .select("id, codigo_procedimento, descricao_procedimento").eq("faturamento_id", faturamentoId);

  const currentItemsList: ProcedimentoPreExistente[] = (currentItems || []) as ProcedimentoPreExistente[];
  const semItensPreExistentes = currentItemsList.length === 0;

  console.log("[process-descricao-cirurgica] Itens pré-existentes (recarregados):", currentItemsList.length, "| Modo direto:", semItensPreExistentes);

  const normalizeText = (text: string | null | undefined): string => {
    if (!text) return "";
    return text.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
  };

  const findExistingItem = (codigo: string | null, descricao: string | null) => {
    if (codigo) {
      const byCode = currentItemsList.find(item => item.codigo_procedimento === codigo);
      if (byCode) return byCode;
    }
    if (descricao) {
      const nd = normalizeText(descricao);
      const byDesc = currentItemsList.find(item => normalizeText(item.descricao_procedimento) === nd);
      if (byDesc) return byDesc;
    }
    return null;
  };

  const matchContraItensPreExistentes = async (
    descricaoExtraida: string
  ): Promise<{ codigo: string; descricao: string; similaridade: number } | null> => {
    if (!currentItemsList.length) return null;
    let melhorMatch: { codigo: string; descricao: string; similaridade: number } | null = null;
    let melhorScore = 0;

    for (const item of currentItemsList) {
      if (!item.codigo_procedimento && !item.descricao_procedimento) continue;
      const descricaoRef = procedimentosAutorizadosParaIA.find(p => p.codigo === item.codigo_procedimento)?.descricao
        || item.descricao_procedimento || "";
      if (!descricaoRef) continue;
      const { score } = calcularScoreCombinado(descricaoExtraida, descricaoRef);
      console.log(`[process-descricao-cirurgica] Match pré-existente: "${descricaoExtraida.slice(0, 40)}" vs "${descricaoRef.slice(0, 40)}" = ${(score * 100).toFixed(1)}%`);
      if (score > melhorScore) {
        melhorScore = score;
        melhorMatch = { codigo: item.codigo_procedimento || "", descricao: descricaoRef, similaridade: score };
      }
    }

    if (melhorMatch && melhorScore >= 0.35) {
      console.log(`[process-descricao-cirurgica] ✅ Match pré-existente (${(melhorScore * 100).toFixed(1)}%): "${melhorMatch.codigo}" - "${melhorMatch.descricao.slice(0, 50)}"`);
      return melhorMatch;
    }
    return null;
  };

  const procedimentosRevisao: Array<{
    item_faturamento_id: string | null;
    codigo_original: string | null;
    descricao_original: string | null;
    codigo_validado: string | null;
    descricao_validada: string | null;
    metodo_validacao: string;
    similaridade: number | null;
    necessita_revisao: boolean;
  }> = [];

  for (const proc of procedimentosData) {
    const codigoOriginal = proc.codigo_procedimento?.toString().trim() || null;
    const descricaoOriginal = proc.descricao_procedimento?.toString().trim() || null;
    const quantidadeExecutada = proc.quantidade_executada ?? 1;

    let codigoProcedimento: string | null = null;
    let descricaoProcedimento: string | null = null;
    let metodoValidacao = "nao_encontrado";
    let similaridade: number | null = null;
    let validado = false;

    if (codigoOriginal) {
      // Documento com tabela → validar por código
      const validacao = await validarProcedimentoCbhpm(supabase, codigoOriginal, descricaoOriginal, 0.55);
      if (validacao.valido && validacao.codigo_validado) {
        codigoProcedimento = validacao.codigo_validado;
        descricaoProcedimento = validacao.descricao_validada;
        metodoValidacao = validacao.metodo_validacao;
        similaridade = validacao.similaridade ?? null;
        validado = true;
        if (codigoOriginal !== codigoProcedimento) {
          console.log(`[process-descricao-cirurgica] ⚠️ Código CORRIGIDO: "${codigoOriginal}" → "${codigoProcedimento}"`);
        }
      } else {
        const sugestao = validacao.melhor_sugestao;
        procedimentosRevisao.push({
          item_faturamento_id: null, codigo_original: codigoOriginal, descricao_original: descricaoOriginal,
          codigo_validado: sugestao?.codigo ?? null, descricao_validada: sugestao?.descricao ?? null,
          metodo_validacao: sugestao ? "sugestao_baixa_similaridade" : "nao_encontrado",
          similaridade: sugestao?.similaridade ?? null, necessita_revisao: true,
        });
        console.log(`[process-descricao-cirurgica] ❌ Código "${codigoOriginal}" não encontrado na CBHPM`);
        continue;
      }
    } else if (descricaoOriginal) {
      // Documento narrativo → tentar match contra pré-existentes primeiro
      if (!semItensPreExistentes) {
        const matchPre = await matchContraItensPreExistentes(descricaoOriginal);
        if (matchPre && matchPre.codigo) {
          codigoProcedimento = matchPre.codigo;
          descricaoProcedimento = matchPre.descricao;
          metodoValidacao = "match_autorizacao";
          similaridade = matchPre.similaridade;
          validado = true;
          console.log(`[process-descricao-cirurgica] ✅ "${descricaoOriginal.slice(0, 40)}" → autorizado "${codigoProcedimento}" (${(similaridade * 100).toFixed(1)}%)`);
        } else {
          console.log(`[process-descricao-cirurgica] ⚠️ "${descricaoOriginal.slice(0, 40)}" sem match nos autorizados. Tentando CBHPM geral...`);
          const validacao = await validarProcedimentoCbhpm(supabase, null, descricaoOriginal, 0.55);
          if (validacao.valido && validacao.codigo_validado) {
            codigoProcedimento = validacao.codigo_validado;
            descricaoProcedimento = validacao.descricao_validada;
            metodoValidacao = validacao.metodo_validacao;
            similaridade = validacao.similaridade ?? null;
            validado = true;
            console.log(`[process-descricao-cirurgica] ✅ Procedimento adicional CBHPM: "${codigoProcedimento}" (${(similaridade! * 100).toFixed(1)}%)`);
          } else {
            const sugestao = validacao.melhor_sugestao;
            procedimentosRevisao.push({
              item_faturamento_id: null, codigo_original: null, descricao_original: descricaoOriginal,
              codigo_validado: sugestao?.codigo ?? null, descricao_validada: sugestao?.descricao ?? null,
              metodo_validacao: sugestao ? "sugestao_baixa_similaridade" : "nao_encontrado",
              similaridade: sugestao?.similaridade ?? null, necessita_revisao: true,
            });
            console.log(`[process-descricao-cirurgica] ❌ Procedimento adicional "${descricaoOriginal.slice(0, 40)}" não encontrado`);
            continue;
          }
        }
      } else {
        const validacao = await validarProcedimentoCbhpm(supabase, null, descricaoOriginal, 0.40);
        if (validacao.valido && validacao.codigo_validado) {
          codigoProcedimento = validacao.codigo_validado;
          descricaoProcedimento = validacao.descricao_validada;
          metodoValidacao = validacao.metodo_validacao;
          similaridade = validacao.similaridade ?? null;
          validado = true;
          console.log(`[process-descricao-cirurgica] ✅ CBHPM (sem pré-existentes): "${codigoProcedimento}"`);
        } else {
          const sugestao = validacao.melhor_sugestao;
          procedimentosRevisao.push({
            item_faturamento_id: null, codigo_original: null, descricao_original: descricaoOriginal,
            codigo_validado: sugestao?.codigo ?? null, descricao_validada: sugestao?.descricao ?? null,
            metodo_validacao: sugestao ? "sugestao_baixa_similaridade" : "nao_encontrado",
            similaridade: sugestao?.similaridade ?? null, necessita_revisao: true,
          });
          console.log(`[process-descricao-cirurgica] ❌ "${descricaoOriginal.slice(0, 40)}" não encontrado na CBHPM`);
          continue;
        }
      }
    } else {
      console.log("[process-descricao-cirurgica] ⚠️ Procedimento sem código e sem descrição, ignorando.");
      continue;
    }

    if (!validado || !codigoProcedimento) continue;

    const foiCorrigido = codigoOriginal !== null && codigoOriginal !== codigoProcedimento;
    const necessitaRevisao = foiCorrigido && metodoValidacao !== "codigo_exato";

    console.log(`[process-descricao-cirurgica] ✅ Validado (${metodoValidacao}): ${codigoProcedimento} - ${descricaoProcedimento?.slice(0, 60)}`);

    let insertedItemId: string | null = null;

    if (semItensPreExistentes) {
      const { data: newItem, error: insertError } = await supabase.from("itens_faturamento").insert({
        faturamento_id: faturamentoId, medico_id: medicoId,
        codigo_procedimento: codigoProcedimento, descricao_procedimento: descricaoProcedimento,
        quantidade_autorizada: quantidadeExecutada, quantidade_executada: quantidadeExecutada,
        quantidade: quantidadeExecutada, status_item: "pendente",
      }).select("id, codigo_procedimento, descricao_procedimento").single();

      if (insertError) console.error("[process-descricao-cirurgica] Erro ao inserir item (direto):", insertError);
      else {
        console.log("[process-descricao-cirurgica] Item inserido (direto):", codigoProcedimento);
        if (newItem) { currentItemsList.push(newItem as ProcedimentoPreExistente); insertedItemId = (newItem as any).id; }
      }
    } else {
      const existingItem = findExistingItem(codigoProcedimento, descricaoProcedimento);
      if (existingItem) {
        const updateFields: Record<string, unknown> = {
          quantidade_executada: quantidadeExecutada, medico_id: medicoId, updated_at: new Date().toISOString(),
        };
        if (descricaoProcedimento && !existingItem.descricao_procedimento) updateFields.descricao_procedimento = descricaoProcedimento;
        if (codigoProcedimento && !existingItem.codigo_procedimento) updateFields.codigo_procedimento = codigoProcedimento;

        const { error: updateItemError } = await supabase.from("itens_faturamento").update(updateFields).eq("id", existingItem.id);
        if (updateItemError) console.error("[process-descricao-cirurgica] Erro ao atualizar item:", updateItemError);
        else { console.log("[process-descricao-cirurgica] Item atualizado:", codigoProcedimento); insertedItemId = existingItem.id; }
      } else {
        const { data: newItem, error: insertError } = await supabase.from("itens_faturamento").insert({
          faturamento_id: faturamentoId, medico_id: medicoId,
          codigo_procedimento: codigoProcedimento, descricao_procedimento: descricaoProcedimento,
          quantidade_autorizada: quantidadeExecutada, quantidade_executada: quantidadeExecutada,
          quantidade: quantidadeExecutada, status_item: "pendente",
        }).select("id, codigo_procedimento, descricao_procedimento").single();

        if (insertError) console.error("[process-descricao-cirurgica] Erro ao inserir item:", insertError);
        else {
          console.log("[process-descricao-cirurgica] Novo item inserido:", codigoProcedimento);
          if (newItem) { currentItemsList.push(newItem as ProcedimentoPreExistente); insertedItemId = (newItem as any).id; }
        }
      }
    }

    procedimentosRevisao.push({
      item_faturamento_id: insertedItemId, codigo_original: codigoOriginal, descricao_original: descricaoOriginal,
      codigo_validado: codigoProcedimento, descricao_validada: descricaoProcedimento,
      metodo_validacao: metodoValidacao, similaridade, necessita_revisao: necessitaRevisao,
    });
  }

  const temRevisaoPendente = procedimentosRevisao.some(p => p.necessita_revisao);
  console.log("[process-descricao-cirurgica] Concluído.",
    temRevisaoPendente
      ? `${procedimentosRevisao.filter(p => p.necessita_revisao).length} procedimento(s) precisam de revisão.`
      : "Nenhuma revisão necessária.");

  return new Response(JSON.stringify({
    success: true,
    faturamento_id: faturamentoId,
    dados_extraidos: { faturamento: faturamentoData, procedimentos: procedimentosData },
    revisao_procedimentos: procedimentosRevisao,
    tem_revisao_pendente: temRevisaoPendente,
    modelo_utilizado: modeloIdentificado?.nome ?? null,
  }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});