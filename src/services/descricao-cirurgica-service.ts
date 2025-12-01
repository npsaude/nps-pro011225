import { supabase } from "@/integrations/supabase/client";
import type {
  DbDescricaoCirurgica,
  DbDescricaoCirurgicaStatus,
} from "@/db/schema";

export type SimNao = "" | "sim" | "nao";

export interface DescricaoCirurgicaProcedimentoInput {
  procedimento_id: string;
  descricao_procedimento: string;
  codigo_procedimento: string;
  tipo_procedimento: string;
  quantidade: string;
}

export interface DescricaoCirurgicaEquipeInput {
  nome_profissional: string;
  funcao: string;
  conselho: string;
  numero_conselho: string;
  uf_conselho: string;
}

export interface DescricaoCirurgicaMaterialInput {
  material_id: string;
  nome_material: string;
  descricao_material: string;
  quantidade: string;
  lote: string;
  fabricante: string;
}

export interface DescricaoCirurgicaFormData {
  // 1. Identificação do Paciente
  prontuario: string;
  registro: string;
  nome_social: string;
  registro_civil: string;
  cpf: string;
  matricula: string;
  data_nascimento: string;
  idade: string;
  sexo: string;

  // 2. Internação
  convenio_plano: string;
  setor: string;
  leito: string;
  dthr_admissao: string; // datetime-local

  // 3. Info iniciais
  status: string;
  tipo_cirurgia: string;
  data_inicio_procedimento: string;
  hora_inicio_procedimento: string;
  data_fim_procedimento: string;
  hora_fim_procedimento: string;
  diagnostico_pre_operatorio: string;
  diagnostico_pos_operatorio: string;

  // 4. Procedimentos (JSON)
  procedimentos: DescricaoCirurgicaProcedimentoInput[];

  // 5. Equipe (JSON)
  equipe: DescricaoCirurgicaEquipeInput[];

  // 6. Texto da descrição
  descricao_cirurgica: string;

  // 7. Auditoria
  cirurgiao_responsavel: string;
  cirurgiao_responsavel_crm: string;
  data_hora_afere: string; // datetime-local
  usuario_impressao: string;
  data_hora_impressao: string; // datetime-local

  // 8. Materiais (JSON)
  materiais: DescricaoCirurgicaMaterialInput[];

  // 9. Informações adicionais
  diagnostico_pre_igual_pos: SimNao;
  houve_complicacoes: SimNao;
  descricao_complicacoes: string;
  possui_peca_anatomo: SimNao;
  sangramento_estimado: string;
  observacoes_adicionais: string;

  // 10. Plano terapêutico
  uso_antibioticos: string;
  profilaxia_tev_tvp: string;
  troca_curativo: string;
  dieta: string;
  deambulacao: string;
  previsao_alta: string;
  acompanhamento_pela_instituicao: SimNao;
  outras_orientacoes: string;
}

// Resumo para listagem do médico
export interface DescricaoCirurgicaResumoMedico {
  id: string;
  nomeMedico: string | null;
  nomePaciente: string | null;
  dataFimProcedimento: string | null;
  prontuario: string | null;
  status: DbDescricaoCirurgicaStatus | null;
}

function mapSimNao(value: SimNao): boolean | null {
  if (value === "sim") return true;
  if (value === "nao") return false;
  return null;
}

function toIntOrNull(value: string): number | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Cria uma descrição cirúrgica completa em uma única tabela (descricoes_cirurgicas),
 * incluindo procedimentos, equipe e materiais como JSON.
 */
export async function criarDescricaoCirurgica(
  form: DescricaoCirurgicaFormData,
): Promise<DbDescricaoCirurgica> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    throw new Error("Usuário não autenticado. Faça login novamente.");
  }

  const userId = userData.user.id;

  const procedimentosJson =
    form.procedimentos
      ?.filter(
        (p) =>
          p.descricao_procedimento.trim() ||
          p.codigo_procedimento.trim() ||
          p.procedimento_id.trim(),
      )
      .map((p) => ({
        procedimento_id: p.procedimento_id || null,
        descricao_procedimento: p.descricao_procedimento || null,
        codigo_procedimento: p.codigo_procedimento || null,
        tipo_procedimento: p.tipo_procedimento || null,
        quantidade: toIntOrNull(p.quantidade),
      })) ?? [];

  const equipeJson =
    form.equipe
      ?.filter((e) => e.nome_profissional.trim())
      .map((e) => ({
        nome_profissional: e.nome_profissional || null,
        funcao: e.funcao || null,
        conselho: e.conselho || null,
        numero_conselho: e.numero_conselho || null,
        uf_conselho: e.uf_conselho || null,
      })) ?? [];

  const materiaisJson =
    form.materiais
      ?.filter(
        (m) => m.nome_material.trim() || m.material_id.trim() || m.lote.trim(),
      )
      .map((m) => ({
        material_id: m.material_id || null,
        nome_material: m.nome_material || null,
        descricao_material: m.descricao_material || null,
        quantidade: toIntOrNull(m.quantidade),
        lote: m.lote || null,
        fabricante: m.fabricante || null,
      })) ?? [];

  const { data: inserted, error } = await supabase
    .from("descricoes_cirurgicas")
    .insert({
      user_id: userId,

      // Status geral
      status: form.status || "AGUARDANDO",

      // 1. Identificação
      prontuario: form.prontuario || null,
      registro: form.registro || null,
      nome_social: form.nome_social || null,
      registro_civil: form.registro_civil || null,
      cpf: form.cpf || null,
      matricula: form.matricula || null,
      data_nascimento: form.data_nascimento || null,
      idade: toIntOrNull(form.idade),
      sexo: form.sexo || null,

      // 2. Internação
      convenio_plano: form.convenio_plano || null,
      setor: form.setor || null,
      leito: form.leito || null,
      dthr_admissao: form.dthr_admissao || null,

      // 3. Iniciais
      tipo_cirurgia: form.tipo_cirurgia || null,
      data_inicio_procedimento: form.data_inicio_procedimento || null,
      hora_inicio_procedimento: form.hora_inicio_procedimento || null,
      data_fim_procedimento: form.data_fim_procedimento || null,
      hora_fim_procedimento: form.hora_fim_procedimento || null,
      diagnostico_pre_operatorio: form.diagnostico_pre_operatorio || null,
      diagnostico_pos_operatorio: form.diagnostico_pos_operatorio || null,

      // 4. Procedimentos (JSON)
      procedimentos:
        procedimentosJson.length > 0 ? procedimentosJson : null,

      // 5. Equipe (JSON)
      equipe: equipeJson.length > 0 ? equipeJson : null,

      // 6. Texto descrição
      descricao_cirurgica: form.descricao_cirurgica || null,

      // 7. Auditoria
      cirurgiao_responsavel: form.cirurgiao_responsavel || null,
      cirurgiao_responsavel_crm: form.cirurgiao_responsavel_crm || null,
      data_hora_afere: form.data_hora_afere || null,
      usuario_impressao: form.usuario_impressao || null,
      data_hora_impressao: form.data_hora_impressao || null,

      // 8. Materiais (JSON)
      materiais: materiaisJson.length > 0 ? materiaisJson : null,

      // 9. Adicionais
      diagnostico_pre_igual_pos: mapSimNao(form.diagnostico_pre_igual_pos),
      houve_complicacoes: mapSimNao(form.houve_complicacoes),
      descricao_complicacoes: form.descricao_complicacoes || null,
      possui_peca_anatomo: mapSimNao(form.possui_peca_anatomo),
      sangramento_estimado: form.sangramento_estimado || null,
      observacoes_adicionais: form.observacoes_adicionais || null,

      // 10. Plano terapêutico
      uso_antibioticos: form.uso_antibioticos || null,
      profilaxia_tev_tvp: form.profilaxia_tev_tvp || null,
      troca_curativo: form.troca_curativo || null,
      dieta: form.dieta || null,
      deambulacao: form.deambulacao || null,
      previsao_alta: form.previsao_alta || null,
      acompanhamento_pela_instituicao: mapSimNao(
        form.acompanhamento_pela_instituicao,
      ),
      outras_orientacoes: form.outras_orientacoes || null,
    })
    .select("*")
    .single();

  if (error || !inserted) {
    throw new Error(
      error?.message || "Não foi possível salvar a descrição cirúrgica.",
    );
  }

  return inserted as DbDescricaoCirurgica;
}

/**
 * Lista descrições cirúrgicas pertencentes ao médico logado (user_id do Auth),
 * trazendo apenas os campos necessários para o acompanhamento.
 */
export async function listarDescricoesCirurgicasDoMedicoLogado(): Promise<
  DescricaoCirurgicaResumoMedico[]
> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    throw new Error("Usuário não autenticado. Faça login novamente.");
  }

  const userId = userData.user.id;

  const { data, error } = await supabase
    .from("descricoes_cirurgicas")
    .select(
      "id, prontuario, nome_social, registro_civil, data_fim_procedimento, status, cirurgiao_responsavel",
    )
    .eq("user_id", userId)
    .order("data_fim_procedimento", { ascending: false });

  if (error) {
    throw new Error(
      error.message ||
        "Não foi possível carregar as descrições cirúrgicas do médico.",
    );
  }

  const rows = (data ?? []) as Partial<DbDescricaoCirurgica>[];

  return rows.map((item) => ({
    id: item.id as string,
    nomeMedico: (item.cirurgiao_responsavel as string | null) ?? null,
    nomePaciente:
      ((item.nome_social as string | null) ||
        (item.registro_civil as string | null)) ?? null,
    dataFimProcedimento:
      (item.data_fim_procedimento as string | null) ?? null,
    prontuario: (item.prontuario as string | null) ?? null,
    status: (item.status as DbDescricaoCirurgicaStatus | null) ?? null,
  }));
}