/**
 * Helper para registrar uso de tokens da OpenAI na tabela openai_usage_logs.
 *
 * Preços por 1K tokens (USD) — atualizar conforme tabela da OpenAI.
 */

const PRECOS_POR_1K_TOKENS: Record<string, { input: number; output: number }> = {
  "gpt-4.1": { input: 0.002, output: 0.008 },
  "gpt-4.1-mini": { input: 0.0004, output: 0.0016 },
  "gpt-4.1-nano": { input: 0.0001, output: 0.0004 },
  "gpt-4.5": { input: 0.075, output: 0.15 },
  "gpt-4o": { input: 0.0025, output: 0.01 },
  "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
  "gpt-4-turbo": { input: 0.01, output: 0.03 },
  "o3-mini": { input: 0.0011, output: 0.0044 },
  "gpt-5": { input: 0.00125, output: 0.01 },
  "gpt-5.1": { input: 0.00125, output: 0.01 },
  "gpt-5.2": { input: 0.00175, output: 0.014 },
  "gpt-5.3": { input: 0.00175, output: 0.014 },
  "gpt-5.3-chat-latest": { input: 0.00175, output: 0.014 },
  "gpt-5.4": { input: 0.0025, output: 0.015 },
  "gpt-5.4-pro": { input: 0.03, output: 0.18 },
};

function getPrecoPorModelo(model: string): { input: number; output: number } | null {
  const normalizedModel = model.toLowerCase();
  const exactMatch = PRECOS_POR_1K_TOKENS[normalizedModel];
  if (exactMatch) return exactMatch;

  const prefixMatch = Object.entries(PRECOS_POR_1K_TOKENS)
    .sort(([a], [b]) => b.length - a.length)
    .find(([supportedModel]) => normalizedModel.startsWith(supportedModel));

  return prefixMatch?.[1] ?? null;
}

function estimarCusto(
  promptTokens: number,
  completionTokens: number,
  model: string,
): number {
  const preco = getPrecoPorModelo(model);
  if (!preco) return 0;
  return (promptTokens / 1000) * preco.input + (completionTokens / 1000) * preco.output;
}

interface LogUsageParams {
  supabase: any;
  userId?: string | null;
  faturamentoId?: string | null;
  edgeFunction: string;
  model: string;
  usage: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  } | null | undefined;
}

export async function logOpenAIUsage(params: LogUsageParams): Promise<void> {
  const { supabase, userId, faturamentoId, edgeFunction, model, usage } = params;

  if (!usage) {
    console.warn(`[${edgeFunction}] OpenAI usage data não disponível, pulando log de tokens.`);
    return;
  }

  const promptTokens = usage.prompt_tokens ?? 0;
  const completionTokens = usage.completion_tokens ?? 0;
  const totalTokens = usage.total_tokens ?? (promptTokens + completionTokens);
  const estimatedCost = estimarCusto(promptTokens, completionTokens, model);

  console.log(
    `[${edgeFunction}] 📊 Tokens usados: prompt=${promptTokens}, completion=${completionTokens}, total=${totalTokens}, custo_estimado=$${estimatedCost.toFixed(6)} (${model})`,
  );

  try {
    const { error } = await supabase.from("openai_usage_logs").insert({
      user_id: userId || null,
      faturamento_id: faturamentoId || null,
      edge_function: edgeFunction,
      model,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: totalTokens,
      estimated_cost_usd: estimatedCost,
    });

    if (error) {
      console.error(`[${edgeFunction}] Erro ao salvar log de tokens:`, error);
    }
  } catch (e) {
    console.error(`[${edgeFunction}] Erro inesperado ao salvar log de tokens:`, e);
  }
}