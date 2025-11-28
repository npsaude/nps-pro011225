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