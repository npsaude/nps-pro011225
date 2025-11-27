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
      paciente: "Paciente Exemplo",
      procedimento: "Exame de imagem",
    },
  };
}

/**
 * Mock do endpoint POST /sadt/enviar
 * Cria um protocolo fictício e um registro de SADT com status AGUARDANDO_APROVACAO.
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

  // Prepara futura integração com OCR (já chamando o mock)
  void processarOcr({ sadtId });

  return {
    protocolo,
    status: "AGUARDANDO_APROVACAO",
    sadtId,
  };
}