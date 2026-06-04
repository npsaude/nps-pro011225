/**
 * Cliente tipado para as Edge Functions de processamento do faturamento médico.
 *
 * Centraliza as chamadas que antes eram feitas com `fetch()` direto para URLs
 * hardcoded (https://<ref>.supabase.co/functions/v1/...) e SEM cabeçalho de
 * autenticação. Ao usar `supabase.functions.invoke`, o JWT do usuário logado e
 * a apikey são anexados automaticamente, eliminando a chamada anônima
 * (achado F-3 da auditoria de segurança) e removendo a URL hardcoded.
 *
 * O contrato de erro preserva o comportamento anterior: quando a função retorna
 * um corpo `{ error: string }` (em status 2xx ou não-2xx), essa mensagem é
 * propagada; caso contrário, usa-se a mensagem de fallback informada.
 */

import { supabase } from "@/integrations/supabase/client";

export type ProcessFileRef = { path: string };

export type ProcessGuiaSolicitacaoBody = {
  userId: string;
  faturamentoId: string;
  files: ProcessFileRef[];
};

export type ProcessGuiaAutorizacaoBody = ProcessGuiaSolicitacaoBody & {
  tipoCirurgia: "ELETIVA" | "EMERGENCIAL";
};

export type ProcessDescricaoCirurgicaBody = ProcessGuiaSolicitacaoBody;

export type ProcessSadtAcompanhamentoBody = {
  userId: string;
  files: ProcessFileRef[];
  forceInsert?: boolean;
  forceOwnership?: boolean;
};

/**
 * Tenta extrair a mensagem específica (`{ error }`) do corpo da resposta de
 * erro de uma Edge Function. Retorna undefined se o corpo não for um JSON com
 * o campo `error`.
 */
const extractServerError = async (error: unknown): Promise<string | undefined> => {
  const context = (error as { context?: unknown }).context;
  if (context instanceof Response) {
    try {
      const parsed = await context.clone().json();
      if (parsed && typeof parsed.error === "string") {
        return parsed.error;
      }
    } catch {
      // corpo não-JSON: mantém fallback
    }
  }
  return undefined;
};

const invokeProcessFunction = async <TBody extends object>(
  fn: string,
  body: TBody,
  fallbackError: string,
): Promise<unknown> => {
  const { data, error } = await supabase.functions.invoke(fn, { body });

  if (error) {
    const serverMessage = await extractServerError(error);
    throw new Error(serverMessage || fallbackError);
  }

  if (
    data &&
    typeof data === "object" &&
    "error" in data &&
    (data as { error?: unknown }).error
  ) {
    throw new Error(String((data as { error: unknown }).error));
  }

  return data;
};

export const processGuiaSolicitacao = (body: ProcessGuiaSolicitacaoBody) =>
  invokeProcessFunction(
    "process-guia-solicitacao",
    body,
    "Houve erro ao processar a guia de solicitação.",
  );

export const processGuiaAutorizacao = (body: ProcessGuiaAutorizacaoBody) =>
  invokeProcessFunction(
    "process-guia-autorizacao",
    body,
    "Houve erro ao processar a guia de autorização.",
  );

export const processDescricaoCirurgica = (body: ProcessDescricaoCirurgicaBody) =>
  invokeProcessFunction(
    "process-descricao-cirurgica",
    body,
    "Houve erro ao processar a descrição cirúrgica.",
  );

/**
 * Processa a SADT de acompanhamento. Diferente das demais, a resposta de
 * sucesso pode conter sinalizações (not_owner, duplicate) que a página inspeciona,
 * por isso o valor retornado (data) é repassado ao chamador.
 */
export const processSadtAcompanhamento = (body: ProcessSadtAcompanhamentoBody) =>
  invokeProcessFunction(
    "process-sadt-acompanhamento",
    body,
    "Arquivos enviados, mas houve erro ao processar a SADT.",
  );
