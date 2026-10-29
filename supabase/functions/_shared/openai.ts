/**
 * OpenAI Responses API client for the Edge Functions (plain fetch, no SDK).
 *
 * OPENAI_API_KEY is an Edge Function secret: it never reaches the app (there is no EXPO_PUBLIC_
 * variant), and the app never calls OpenAI directly. Requests set `store: false`, so OpenAI doesn't
 * keep the response for later retrieval; the functions don't store images or texts either.
 *
 * Settings (Edge Function secrets, all optional except the key):
 *   OPENAI_MODEL            default gpt-5.4-mini (cost-efficient, accepts images)
 *   OPENAI_REASONING_EFFORT default "low" for reasoning models (gpt-5*, o*); "off" sends none
 *   OPENAI_IMAGE_DETAIL     default "auto" (low | high | auto)
 *   OPENAI_BASE_URL         only for local tests (mock server)
 */
export const OPENAI_DEFAULT_MODEL = 'gpt-5.4-mini';

export const openaiConfigured = () => !!Deno.env.get('OPENAI_API_KEY');
export const openaiModel = () => Deno.env.get('OPENAI_MODEL')?.trim() || OPENAI_DEFAULT_MODEL;
const baseUrl = () => (Deno.env.get('OPENAI_BASE_URL')?.trim() || 'https://api.openai.com/v1').replace(/\/+$/, '');

function reasoning(model: string): { effort: string } | undefined {
  const configured = Deno.env.get('OPENAI_REASONING_EFFORT')?.trim();
  if (configured === 'off') return undefined;
  if (configured) return { effort: configured };
  return /^(gpt-5|o\d)/.test(model) ? { effort: 'low' } : undefined;
}

const imageDetail = () => {
  const d = Deno.env.get('OPENAI_IMAGE_DETAIL')?.trim();
  return d === 'low' || d === 'high' || d === 'auto' ? d : 'auto';
};

export interface Usage {
  inputTokens: number;
  outputTokens: number;
}

/** A failed OpenAI request; `status` is OpenAI's HTTP status (0 = network / timeout). */
export class OpenAIError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(`openai ${status} ${code}`);
  }
}

type Json = Record<string, unknown>;

/** POST /responses with a 55 s timeout and one retry for network errors and 5xx (not for 4xx). */
async function post(body: Json): Promise<Response> {
  const key = Deno.env.get('OPENAI_API_KEY');
  if (!key) throw new OpenAIError(0, 'not_configured');
  let last: unknown = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${baseUrl()}/responses`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(55_000),
      });
      if (res.ok) return res;
      const err = await res.json().catch(() => ({}));
      const code = String((err as { error?: { code?: string; type?: string } }).error?.code ?? (err as { error?: { type?: string } }).error?.type ?? 'error');
      if (res.status >= 500 && attempt === 0) {
        last = new OpenAIError(res.status, code);
        continue;
      }
      throw new OpenAIError(res.status, code);
    } catch (e) {
      if (e instanceof OpenAIError) throw e;
      last = e;
      if (attempt === 0) continue;
    }
  }
  if (last instanceof OpenAIError) throw last;
  throw new OpenAIError(0, (last as Error)?.name === 'TimeoutError' ? 'timeout' : 'network');
}

const usageOf = (r: Json): Usage => {
  const u = (r.usage ?? {}) as { input_tokens?: number; output_tokens?: number };
  return { inputTokens: u.input_tokens ?? 0, outputTokens: u.output_tokens ?? 0 };
};

/** Text of the assistant message, or a refusal. */
function readOutput(r: Json): { text: string | null; refused: boolean } {
  const output = (r.output ?? []) as { type?: string; content?: { type?: string; text?: string; refusal?: string }[] }[];
  let text = '';
  let refused = false;
  for (const item of output) {
    if (item.type !== 'message') continue;
    for (const c of item.content ?? []) {
      if (c.type === 'output_text' && c.text) text += c.text;
      if (c.type === 'refusal') refused = true;
    }
  }
  return { text: text || null, refused };
}

/**
 * One structured-output request (optionally with a JPEG). Returns the parsed JSON, or null when the
 * model refused, the answer was cut off or isn't valid JSON — the caller then answers
 * "invalid_response" instead of showing anything made up.
 */
export async function openaiStructured(params: {
  system: string;
  text: string;
  imageBase64?: string;
  schemaName: string;
  schema: Json;
  maxOutputTokens?: number;
}): Promise<{ data: unknown | null; usage: Usage; model: string; refused: boolean }> {
  const model = openaiModel();
  const content: Json[] = [{ type: 'input_text', text: params.text }];
  if (params.imageBase64) content.push({ type: 'input_image', image_url: `data:image/jpeg;base64,${params.imageBase64}`, detail: imageDetail() });
  const res = await post({
    model,
    instructions: params.system,
    input: [{ role: 'user', content }],
    text: { format: { type: 'json_schema', name: params.schemaName, schema: params.schema, strict: true } },
    max_output_tokens: params.maxOutputTokens ?? 2500,
    reasoning: reasoning(model),
    store: false,
  });
  const r = (await res.json()) as Json;
  const usage = usageOf(r);
  const { text, refused } = readOutput(r);
  if (r.status !== 'completed' || !text) return { data: null, usage, model, refused };
  try {
    return { data: JSON.parse(text), usage, model, refused: false };
  } catch {
    return { data: null, usage, model, refused: false };
  }
}

export type ChatTurn = { role: 'user' | 'assistant'; content: string };

/** Plain text reply (coach, non-streaming). */
export async function openaiText(system: string, messages: ChatTurn[], maxOutputTokens = 2500): Promise<{ text: string | null; refused: boolean; usage: Usage; model: string }> {
  const model = openaiModel();
  const res = await post({ model, instructions: system, input: messages, max_output_tokens: maxOutputTokens, reasoning: reasoning(model), store: false });
  const r = (await res.json()) as Json;
  const out = readOutput(r);
  return { text: r.status === 'completed' ? out.text : null, refused: out.refused, usage: usageOf(r), model };
}

/** Streaming text reply: yields text deltas; the final value says how it ended. */
export async function* openaiStream(system: string, messages: ChatTurn[], maxOutputTokens = 2500): AsyncGenerator<string, { ok: boolean; refused: boolean }> {
  const model = openaiModel();
  const res = await post({ model, instructions: system, input: messages, max_output_tokens: maxOutputTokens, reasoning: reasoning(model), store: false, stream: true });
  const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  let ok = false;
  let refused = false;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';
    for (const ev of events) {
      const line = ev.split('\n').find((l) => l.startsWith('data: '));
      if (!line) continue;
      let data: { type?: string; delta?: string };
      try {
        data = JSON.parse(line.slice(6));
      } catch {
        continue;
      }
      if (data.type === 'response.output_text.delta' && data.delta) yield data.delta;
      else if (data.type === 'response.refusal.delta') refused = true;
      else if (data.type === 'response.completed') ok = true;
      else if (data.type === 'response.failed' || data.type === 'response.incomplete' || data.type === 'error') ok = false;
    }
  }
  return { ok, refused };
}
