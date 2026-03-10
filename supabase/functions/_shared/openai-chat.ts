// @ts-nocheck
/**
 * Modelos que suportam response_format: json_object e image_url via URL.
 * Modelos legados (gpt-4, gpt-3.5-turbo, etc.) não suportam esses recursos.
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
  "o1",
  "o1-mini",
  "o3",
  "o3-mini",
];

/**
 * Verifica se o modelo suporta response_format: json_object
 */
export function modelSupportsJsonFormat(model: string): boolean {
  const m = model.toLowerCase();
  return MODELS_WITH_JSON_FORMAT.some((supported) => m.startsWith(supported));
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
 * - Modelos novos (gpt-4o, etc.): com response_format: json_object
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

  // Para modelos legados, reforçar no prompt que a resposta deve ser JSON puro
  const finalUserText = supportsJsonFormat
    ? userText
    : userText + "\n\nIMPORTANTE: Responda SOMENTE com o JSON válido, sem texto adicional, sem markdown, sem explicações.";

  const body: any = {
    model,
    temperature: 0,
    max_tokens: maxTokens,
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

  // Apenas adicionar response_format se o modelo suportar
  if (supportsJsonFormat) {
    body.response_format = { type: "json_object" };
  }

  console.log(`[openai-chat] Chamando modelo: ${model} | json_format: ${supportsJsonFormat} | imagens: ${imageBase64List.length}`);

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
