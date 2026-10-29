import Anthropic from 'npm:@anthropic-ai/sdk@1.3.0';

/**
 * Server-side Claude client. ANTHROPIC_API_KEY is an Edge Function secret and never reaches the app.
 * Images and messages are sent per request and are not stored by these functions.
 */
export const MODEL = 'claude-opus-5-5';

let client: Anthropic | null = null;
/** 55 s timeout keeps requests inside the Edge Function limit; one retry for transient errors. */
export const claude = () =>
  (client ??= new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY'), baseURL: Deno.env.get('ANTHROPIC_BASE_URL') || undefined, timeout: 55_000, maxRetries: 1 }));

export const aiConfigured = () => !!Deno.env.get('ANTHROPIC_API_KEY');

/**
 * One structured-output request. Returns the parsed JSON, or null on refusal / truncation / invalid
 * JSON (the caller then validates the shape with zod and answers "invalid_response").
 */
export async function structured(params: {
  system: string;
  content: Anthropic.Beta.BetaContentBlockParam[];
  schema: Record<string, unknown>;
  effort?: 'low' | 'medium' | 'high';
  maxTokens?: number;
}): Promise<unknown | null> {
  const response = await claude().beta.messages.create({
    model: MODEL,
    max_tokens: params.maxTokens ?? 4000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: params.system,
    output_config: { effort: params.effort ?? 'low', format: { type: 'json_schema', schema: params.schema } },
    messages: [{ role: 'user', content: params.content }],
  });
  if (response.stop_reason === 'refusal' || response.stop_reason === 'max_tokens') return null;
  const text = response.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')?.text;
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
