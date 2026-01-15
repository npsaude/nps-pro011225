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
 * Inclui o campo "Token OpenAI".
 */
export interface DbAppSettings {
  id: string;
  openaiApiToken: string | null;
  asaasToken: string | null;
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