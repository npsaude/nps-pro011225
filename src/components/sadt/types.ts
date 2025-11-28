export type SadtCadastroStatus = "ATIVO" | "INATIVO";

export type SadtEstagio =
  | "AGUARDANDO"
  | "RECEBIDO"
  | "EM_FATURAMENTO"
  | "PAGO"
  | "RETORNO_POR_GLOSA"
  | "DEFESA_POR_GLOSA";

export interface SadtResumo {
  id: string;
  numeroGuiaPrincipal: string;
  dataAutorizacao: string;
  nomeProfissionalSolicitante: string;
  identificacaoOperadora: string;
  status: SadtCadastroStatus;
  estagio: SadtEstagio;
}