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

export type DbUserRole = "MEDICO" | "ADMIN";

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