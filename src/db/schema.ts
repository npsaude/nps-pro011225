import {
  type SadtCadastroStatus,
  type SadtEstagio,
} from "@/components/sadt/types";

/**
 * Registro completo da tabela sadts (cadastro de SADT).
 * Estende o que você já usa como SadtResumo na UI.
 */
export interface DbSadt {
  id: string;
  medicoId: string;
  numeroGuiaPrincipal: string;
  dataAutorizacao: string; // ISO date (YYYY-MM-DD)
  nomeProfissionalSolicitante: string;
  identificacaoOperadora: string;
  telefoneContato: string | null;
  protocolo: string | null;
  statusCadastro: SadtCadastroStatus;
  estagio: SadtEstagio;
  createdAt: string; // ISO datetime
  updatedAt: string; // ISO datetime
}

export type DbUserRole = "MEDICO" | "ADMIN" | "SUPER_ADMIN";

export interface DbAppUser {
  id: string;
  nome: string;
  email: string;
  role: DbUserRole;
  createdAt: string;
  updatedAt: string;
}

/**
 * Tabela de configurações gerais (app_settings).
 */
export interface DbAppSettings {
  id: string;
  openaiApiToken: string | null;
  asaasToken: string | null;
  videoYoutube: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Arquivos enviados para uma SADT.
 * Os arquivos devem ser armazenados em pastas por médico, ex:
 *   "medicos/{medicoId}/{fileName}"
 */
export interface DbSadtFile {
  id: string;
  sadtId: string;
  medicoId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  filePath: string;
  uploadedAt: string;
}

/**
 * Registro de uma análise da OpenAI sobre uma SADT/arquivo.
 */
export type DbSadtAnalysisStatus =
  | "PENDENTE"
  | "EM_PROCESSAMENTO"
  | "CONCLUIDO"
  | "ERRO";

export interface DbSadtAnalysis {
  id: string;
  sadtId: string;
  sadtFileId: string | null;
  model: string;
  status: DbSadtAnalysisStatus;
  rawResponse: unknown | null;
  extractedFields: Record<string, unknown> | null;
  errorMessage: string | null;
  createdAt: string;
  finishedAt: string | null;
}

/**
 * Usuário do sistema (tabela: usuarios_sistema)
 * Campos pedidos:
 * - id_user
 * - nome
 * - email
 * - celular
 * - regra (admin, médico)
 * - ativo
 * - criado_em
 *
 * Observação: regra aqui reaproveita o DbUserRole definido acima.
 */
export interface DbSystemUser {
  id_user: string; // uuid
  nome: string;
  email: string;
  celular: string | null;
  regra: DbUserRole; // 'ADMIN' | 'MEDICO'
  ativo: boolean;
  criado_em: string; // ISO datetime (timestamptz)
  avatar_url?: string | null;
  crm?: string | null;
  empresa_clinica_base?: string | null;
}

export type DbDescricaoCirurgicaStatus =
  | "AGUARDANDO"
  | "CONFIRMADO"
  | "EM_FATURAMENTO"
  | "PAGO"
  | "EM_GLOSA";

/**
 * Item de procedimento dentro da descrição cirúrgica.
 * Armazenado como JSON em descricoes_cirurgicas.procedimentos.
 */
export interface DbDescricaoCirurgicaProcedimento {
  procedimento_id: string | null;
  descricao_procedimento: string | null;
  codigo_procedimento: string | null;
  tipo_procedimento: string | null; // principal / secundário
  quantidade: number | null;
}

/**
 * Item de equipe dentro da descrição cirúrgica.
 * Armazenado como JSON em descricoes_cirurgicas.equipe.
 */
export interface DbDescricaoCirurgicaEquipe {
  nome_profissional: string | null;
  funcao: string | null;
  conselho: string | null;
  numero_conselho: string | null;
  uf_conselho: string | null;
}

/**
 * Item de material dentro da descrição cirúrgica.
 * Armazenado como JSON em descricoes_cirurgicas.materiais.
 */
export interface DbDescricaoCirurgicaMaterial {
  material_id: string | null;
  nome_material: string | null;
  descricao_material: string | null;
  quantidade: number | null;
  lote: string | null;
  fabricante: string | null;
}

/**
 * Descrição cirúrgica (tabela: descricoes_cirurgicas)
 * Todos os dados (incluindo procedimentos, equipe e materiais) estão nesta tabela.
 */
export interface DbDescricaoCirurgica {
  id: string;
  user_id: string;

  // Status geral da descrição / caso
  status: DbDescricaoCirurgicaStatus | null;

  // 1. Identificação do Paciente
  prontuario: string | null;
  registro: string | null;
  nome_social: string | null;
  registro_civil: string | null;
  cpf: string | null;
  matricula: string | null;
  data_nascimento: string | null; // ISO date
  idade: number | null;
  sexo: string | null;

  // 2. Informações de Internação
  convenio_plano: string | null;
  setor: string | null;
  leito: string | null;
  dthr_admissao: string | null; // ISO datetime

  // 3. Informações Iniciais da Cirurgia
  tipo_cirurgia: string | null;
  data_inicio_procedimento: string | null; // ISO date
  hora_inicio_procedimento: string | null; // HH:MM:SS
  data_fim_procedimento: string | null; // ISO date
  hora_fim_procedimento: string | null; // HH:MM:SS
  diagnostico_pre_operatorio: string | null;
  diagnostico_pos_operatorio: string | null;

  // 4. Procedimentos realizados (JSON)
  procedimentos: DbDescricaoCirurgicaProcedimento[] | null;

  // 5. Equipe cirúrgica (JSON)
  equipe: DbDescricaoCirurgicaEquipe[] | null;

  // 6. Texto da Descrição Cirúrgica
  descricao_cirurgica: string | null;

  // 7. Informações de Auditoria
  cirurgiao_responsavel: string | null;
  cirurgiao_responsavel_crm: string | null;
  data_hora_afere: string | null;
  usuario_impressao: string | null;
  data_hora_impressao: string | null;

  // 8. Materiais utilizados (OPME) (JSON)
  materiais: DbDescricaoCirurgicaMaterial[] | null;

  // 9. Informações Adicionais
  diagnostico_pre_igual_pos: boolean | null;
  houve_complicacoes: boolean | null;
  descricao_complicacoes: string | null;
  possui_peca_anatomo: boolean | null;
  sangramento_estimado: string | null;
  observacoes_adicionais: string | null;

  // 10. Plano Terapêutico Pós-operatório
  uso_antibioticos: string | null;
  profilaxia_tev_tvp: string | null;
  troca_curativo: string | null;
  dieta: string | null;
  deambulacao: string | null;
  previsao_alta: string | null;
  acompanhamento_pela_instituicao: boolean | null;
  outras_orientacoes: string | null;

  // Pasta do Storage onde os arquivos desta descrição foram salvos
  storage_folder: string | null;

  created_at: string;
  updated_at: string;
}

export type DbBillingInterval = "DAY" | "WEEK" | "MONTH" | "YEAR";

export interface DbSubscriptionPlan {
  id: string;
  name: string;
  code: string;
  description: string | null;
  price_cents: number;
  currency: string;
  billing_interval: DbBillingInterval;
  interval_count: number;
  external_plan_id: string | null;
  setup_fee_cents: number;
  trial_days: number;
  metadata: unknown | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export type DbSubscriptionEnrollmentStatus =
  | "PENDING"
  | "TRIAL"
  | "ACTIVE"
  | "PAUSED"
  | "CANCELED"
  | "FAILED";

export interface DbSubscriptionEnrollment {
  id: string;
  plan_id: string;
  asaas_subscription_id: string | null;
  asaas_customer_id: string | null;
  user_name: string;
  user_email: string;
  user_phone: string | null;
  status: DbSubscriptionEnrollmentStatus;
  payment_method: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  started_at: string | null;
  ended_at: string | null;
  last_payment_at: string | null;
  metadata: unknown | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ==============================
// Faturamento médico (multi-tenant)
// ==============================

export type DbFaturamentoStatusPagamento =
  | "pendente"
  | "pago_integral"
  | "pago_parcial"
  | "glosado";

export type DbItemTipoProcedimento =
  | "principal"
  | "secundario"
  | "anestesia"
  | "sadt";

export type DbItemStatusPagamento =
  | "pendente"
  | "pago_integral"
  | "pago_parcial"
  | "glosado_total"
  | "glosado_parcial";

/**
 * Cabeçalho do faturamento (tabela: faturamentos)
 * Multi-tenant por médico logado: medico_id = auth.uid()
 */
export interface DbFaturamento {
  id: string;
  medico_id: string;

  // Identificação
  numero_guia_honorarios: string | null;
  numero_autorizacao: string | null;
  numero_guia_internacao: string | null;

  // Atendimento
  data_atendimento: string | null; // ISO date
  data_cirurgia: string | null; // ISO date
  hora_inicio: string | null; // HH:mm:ss
  hora_fim: string | null; // HH:mm:ss

  // Hospital como texto (origem: public.clinicas.nome_fantasia)
  hospital_nome: string | null;
  hospital_codigo_cnes: string | null;

  // Paciente
  paciente_nome: string | null;
  paciente_cpf: string | null;
  paciente_carteirinha: string | null;
  paciente_convenio: string | null;

  // Diagnóstico
  diagnostico_cid: string | null;
  diagnostico_descricao: string | null;

  // Equipe (principal)
  cirurgiao_principal_nome: string | null;
  cirurgiao_principal_crm: string | null;
  cirurgiao_principal_uf: string | null;
  cirurgiao_principal_cbo: string | null;

  atuou_como: string | null;

  // Totais (calculados)
  valor_total_faturado: number;
  valor_total_glosa: number;
  valor_total_desconto: number;
  valor_total_liquido: number;
  valor_total_repasse: number;

  // Pagamento
  forma_pagamento: string | null;
  grau_participacao: string | null;
  data_pagamento: string | null; // ISO date
  status_pagamento: DbFaturamentoStatusPagamento;

  // Documentos (paths/URLs do Storage)
  url_guia_autorizacao: string[];
  url_descricao_cirurgica: string[];
  url_guia_honorarios: string[];
  url_relatorio_analitico: string[];

  created_at: string;
  updated_at: string;
}

/**
 * Item de faturamento (tabela: itens_faturamento)
 */
export interface DbItemFaturamento {
  id: string;
  faturamento_id: string;

  // Procedimento
  codigo_procedimento: string | null;
  descricao_procedimento: string | null;
  tipo_procedimento: DbItemTipoProcedimento | null;
  quantidade: number;

  // Profissional executor
  profissional_nome: string | null;
  profissional_crm: string | null;
  profissional_uf: string | null;
  profissional_cbo: string | null;
  percentual_participacao: number;

  // Valores base
  valor_unitario: number;
  valor_total_item: number;

  // Conciliação
  valor_faturado: number;
  valor_glosa: number;
  valor_desconto: number;
  valor_liquido: number;
  valor_repasse: number;
  percentual_repasse: number;

  status_item: DbItemStatusPagamento;
  motivo_glosa: string | null;
  codigo_glosa: string | null;
  data_conciliacao: string | null; // ISO date

  created_at: string;
  updated_at: string;
}