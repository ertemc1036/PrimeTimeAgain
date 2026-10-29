import type Anthropic from 'npm:@anthropic-ai/sdk@1.3.0';

import { claude, MODEL as CLAUDE_MODEL, structured as claudeStructured } from './claude.ts';
import { openaiConfigured, openaiStream, openaiStructured, openaiText, type ChatTurn, type Usage } from './openai.ts';

/**
 * AI provider for the Edge Functions. OpenAI is used when OPENAI_API_KEY is set; Anthropic (Claude)
 * remains available. AI_PROVIDER=openai|anthropic picks one explicitly when both keys exist.
 * Keys are Edge Function secrets only.
 */
export type Provider = 'openai' | 'anthropic';

export function provider(): Provider | null {
  const wanted = Deno.env.get('AI_PROVIDER')?.trim();
  const hasClaude = !!Deno.env.get('ANTHROPIC_API_KEY');
  if (wanted === 'openai' && openaiConfigured()) return 'openai';
  if (wanted === 'anthropic' && hasClaude) return 'anthropic';
  if (openaiConfigured()) return 'openai';
  return hasClaude ? 'anthropic' : null;
}

export const aiConfigured = () => provider() !== null;

export interface AiMeta {
  provider: Provider;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

const NO_USAGE: Usage = { inputTokens: 0, outputTokens: 0 };

/** Structured JSON from a prompt and an optional JPEG (base64). data = null: refused/cut off/invalid. */
export async function structuredRequest(params: {
  system: string;
  prompt: string;
  imageBase64?: string;
  schemaName: string;
  schema: Record<string, unknown>;
  maxTokens?: number;
}): Promise<{ data: unknown | null; meta: AiMeta }> {
  const p = provider();
  if (p === 'openai') {
    const r = await openaiStructured({ system: params.system, text: params.prompt, imageBase64: params.imageBase64, schemaName: params.schemaName, schema: params.schema, maxOutputTokens: params.maxTokens });
    return { data: r.data, meta: { provider: 'openai', model: r.model, ...r.usage } };
  }
  if (p === 'anthropic') {
    const content: Anthropic.Beta.BetaContentBlockParam[] = [];
    if (params.imageBase64) content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: params.imageBase64 } });
    content.push({ type: 'text', text: params.prompt });
    const data = await claudeStructured({ system: params.system, schema: params.schema, content, maxTokens: params.maxTokens });
    return { data, meta: { provider: 'anthropic', model: CLAUDE_MODEL, ...NO_USAGE } };
  }
  throw new Error('not_configured');
}

/** Coach reply without streaming. */
export async function chatOnce(system: string, messages: ChatTurn[]): Promise<{ text: string | null; refused: boolean }> {
  if (provider() === 'openai') {
    const r = await openaiText(system, messages);
    return { text: r.text?.trim() || null, refused: r.refused };
  }
  const msg = await claude().beta.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system,
    output_config: { effort: 'low' },
    messages,
  } as unknown as Anthropic.Beta.MessageCreateParamsNonStreaming);
  if (msg.stop_reason === 'refusal') return { text: null, refused: true };
  const text = msg.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('').trim();
  return { text: text || null, refused: false };
}

/** Coach reply as text deltas; the return value says how it ended. */
export async function* chatStream(system: string, messages: ChatTurn[]): AsyncGenerator<string, { ok: boolean; refused: boolean }> {
  if (provider() === 'openai') return yield* openaiStream(system, messages);
  const s = claude().beta.messages.stream({
    model: CLAUDE_MODEL,
    max_tokens: 4000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system,
    output_config: { effort: 'low' },
    messages,
  } as unknown as Anthropic.Beta.MessageCreateParamsStreaming);
  for await (const ev of s) {
    if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta' && ev.delta.text) yield ev.delta.text;
  }
  const final = await s.finalMessage();
  return { ok: final.stop_reason !== 'refusal', refused: final.stop_reason === 'refusal' };
}
