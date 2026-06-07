// @ts-nocheck
/**
 * Modelos que suportam response_format: json_object.
 * Modelos legados (gpt-4, gpt-3.5-turbo, etc.) não suportam esse recurso.
 */
const MODELS_WITH_JSON_FORMAT = [
  "gpt-4o",
  "gpt-4o-mini",
  "gpt-4-turbo",
  "gpt-4-turbo-preview",
  "gpt-4-1106-preview",
  "gpt-4-0125-preview",
  "gpt-4.1",
  "gpt-4.1-mini",
  "gpt-4.1-nano",
  "gpt-4.5",
  "gpt-5",
  "gpt-5.1",
  "gpt-5.2",
  "gpt-5.3",
  "gpt-5.4",
  "o1",
  "o1-mini",
  "o3",
  "o3-mini",
];

/**
 * Modelos que usam max_completion_tokens em vez de max_tokens.
 * Inclui modelos o1/o3 e gpt-5+.
 */
const MODELS_WITH_MAX_COMPLETION_TOKENS = [
  "o1",
  "o1-mini",
  "o1-preview",
  "o3",
  "o3-mini",
  "gpt-5",
  "gpt-5.1",
  "gpt-5.2",
  "gpt-5.3",
  "gpt-5.4",
];

/**
 * Modelos que NÃO suportam o parâmetro temperature (só aceitam o default 1).
 */
const MODELS_WITHOUT_TEMPERATURE = [
  "o1",
  "o1-mini",
  "o1-preview",
  "o3",
  "o3-mini",
  "gpt-5",
  "gpt-5.1",
  "gpt-5.2",
  "gpt-5.3",
  "gpt-5.4",
];

/**
 * Verifica se o modelo suporta response_format: json_object
 */
export function modelSupportsJsonFormat(model: string): boolean {
  const m = model.toLowerCase();
  return MODELS_WITH_JSON_FORMAT.some((supported) => m.startsWith(supported));
}

/**
 * Verifica se o modelo usa max_completion_tokens em vez de max_tokens
 */
export function modelUsesMaxCompletionTokens(model: string): boolean {
  const m = model.toLowerCase();
  return MODELS_WITH_MAX_COMPLETION_TOKENS.some((supported) => m.startsWith(supported));
}

/**
 * Verifica se o modelo NÃO suporta o parâmetro temperature
 */
export function modelDisallowsTemperature(model: string): boolean {
  const m = model.toLowerCase();
  return MODELS_WITHOUT_TEMPERATURE.some((supported) => m.startsWith(supported));
}

/**
 * Extrai JSON de uma string que pode conter markdown ou texto extra.
 * Tenta primeiro parse direto, depois extrai bloco ```json ... ```.
 */
export function extractJson(text: string): any {
  // Tenta parse direto
  try {
    return JSON.parse(text);
  } catch {
    // Tenta extrair bloco de código JSON
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (match) {
      try {
        return JSON.parse(match[1].trim());
      } catch {
        // continua
      }
    }
    // Tenta encontrar o primeiro { ... } ou [ ... ] válido
    const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch {
        // continua
      }
    }
    throw new Error("Não foi possível extrair JSON da resposta da OpenAI.");
  }
}

/**
 * Chama a API de chat completions da OpenAI com compatibilidade entre modelos.
 * - Modelos legados (gpt-4): sem response_format, parse robusto do JSON
 * - Modelos novos (gpt-4o, gpt-5, etc.): com response_format: json_object
 * - Modelos o1/o3/gpt-5: usam max_completion_tokens em vez de max_tokens
 */
export async function openaiChatWithImages(params: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userText: string;
  imageBase64List: string[];
  maxTokens?: number;
}): Promise<{ content: string; usage: any }> {
  const { apiKey, model, systemPrompt, userText, imageBase64List, maxTokens = 4096 } = params;

  const supportsJsonFormat = modelSupportsJsonFormat(model);
  const useMaxCompletionTokens = modelUsesMaxCompletionTokens(model);
  const noTemperature = modelDisallowsTemperature(model);

  // Para modelos legados, reforçar no prompt que a resposta deve ser JSON puro
  const finalUserText = supportsJsonFormat
    ? userText
    : userText + "\n\nIMPORTANTE: Responda SOMENTE com o JSON válido, sem texto adicional, sem markdown, sem explicações.";

  const body: any = {
    model,
    ...(noTemperature ? {} : { temperature: 0 }),
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: [
          { type: "text", text: finalUserText },
          ...imageBase64List.map((b64) => ({
            type: "image_url",
            image_url: { url: b64, detail: "high" },
          })),
        ],
      },
    ],
  };

  // Usar o parâmetro correto de tokens conforme o modelo
  if (useMaxCompletionTokens) {
    body.max_completion_tokens = maxTokens;
  } else {
    body.max_tokens = maxTokens;
  }

  // Apenas adicionar response_format se o modelo suportar
  if (supportsJsonFormat) {
    body.response_format = { type: "json_object" };
  }

  // Para modelos de reasoning (gpt-5.x, o-series, codex): definir esforço
  // baixo é o suficiente para extração estruturada e evita consumir todo
  // o orçamento de tokens em "thinking".
  if (noTemperature) {
    body.reasoning_effort = "low";
  }

  console.log(
    `[openai-chat] modelo: ${model} | json_format: ${supportsJsonFormat} | max_completion_tokens: ${useMaxCompletionTokens} | no_temperature: ${noTemperature} | imagens: ${imageBase64List.length}`
  );

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errorText = await resp.text();
    throw new Error(`OpenAI API error: ${errorText}`);
  }

  const completion = await resp.json();
  const content = completion?.choices?.[0]?.message?.content ?? "";
  const usage = completion?.usage;

  return { content, usage };
}
