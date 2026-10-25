import { Platform } from 'react-native';
import type { ZodType } from 'zod';

import { env, isSupabaseConfigured } from '@/config/env';
import { coachReplySchema, foodScanSchema, workoutPhotoSchema, type CoachReply, type FoodScanResult, type WorkoutPhotoResult } from '@/domain/aiSchemas';
import type { WorkoutType } from '@/domain/types';
import { currentLanguage } from '@/i18n';
import { getSupabase } from '@/services/supabase/client';

/**
 * AI calls go ONLY to our Supabase Edge Functions, which hold the AI provider key, verify the
 * user's session and Pro entitlement server-side, rate-limit, and validate model output.
 * Every failure is reported as such; nothing is ever simulated.
 */
export type AiError = 'not_configured' | 'signed_out' | 'not_pro' | 'rate_limited' | 'offline' | 'invalid_response' | 'provider_error' | 'timeout';
export type AiResult<T> = { ok: true; data: T } | { ok: false; error: AiError };

const TIMEOUT_MS = 60_000;

export function mapStatus(status: number, code?: string): AiError {
  if (status === 401) return 'signed_out';
  if (status === 402 || status === 403) return 'not_pro';
  if (status === 429) return 'rate_limited';
  if (status === 503 || code === 'not_configured') return 'not_configured';
  if (code === 'invalid_response') return 'invalid_response';
  return 'provider_error';
}

async function invoke<T>(fn: string, body: Record<string, unknown>, schema: ZodType<T>): Promise<AiResult<T>> {
  if (!isSupabaseConfigured()) return { ok: false, error: 'not_configured' };
  const supabase = await getSupabase();
  if (!supabase) return { ok: false, error: 'not_configured' };
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) return { ok: false, error: 'signed_out' };
  try {
    const { data, error } = await supabase.functions.invoke(fn, { body: { ...body, language: currentLanguage() }, timeout: TIMEOUT_MS });
    if (error) {
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.status === 'number') {
        const code = await ctx
          .clone()
          .json()
          .then((b: { error?: string }) => b.error)
          .catch(() => undefined);
        return { ok: false, error: mapStatus(ctx.status, code) };
      }
      const name = (error as Error).name ?? '';
      return { ok: false, error: name.includes('Timeout') || name === 'AbortError' ? 'timeout' : 'offline' };
    }
    const parsed = schema.safeParse(data);
    return parsed.success ? { ok: true, data: parsed.data } : { ok: false, error: 'invalid_response' };
  } catch (e) {
    return { ok: false, error: (e as Error)?.name === 'AbortError' ? 'timeout' : 'offline' };
  }
}

export const aiAvailable = () => isSupabaseConfigured();

export const scanFood = (imageBase64: string): Promise<AiResult<FoodScanResult>> => invoke('food-scan', { image: imageBase64 }, foodScanSchema);

export const analyzeWorkoutPhoto = (imageBase64: string, selected: WorkoutType): Promise<AiResult<WorkoutPhotoResult>> =>
  invoke('workout-photo', { image: imageBase64, selected }, workoutPhotoSchema);

type Turn = { role: 'user' | 'assistant'; content: string };

/** Non-streaming coach request (fallback and web). */
export const askCoach = (messages: Turn[], context: unknown | null): Promise<AiResult<CoachReply>> => invoke('coach', { messages, context }, coachReplySchema);

/** Parse Server-Sent Events from the coach function. Exported for tests. */
export function parseSse(buffer: string): { events: { t: string; v?: string; code?: string }[]; rest: string } {
  const parts = buffer.split('\n\n');
  const rest = parts.pop() ?? '';
  const events = parts.flatMap((p) => {
    const line = p.split('\n').find((l) => l.startsWith('data: '));
    if (!line) return [];
    try {
      return [JSON.parse(line.slice(6))];
    } catch {
      return [];
    }
  });
  return { events, rest };
}

/**
 * Streaming coach request: `onDelta` receives text as it is generated. Uses expo/fetch on iOS and
 * Android (streaming bodies) and the browser fetch on web. Falls back to a single response if the
 * stream can't be opened.
 */
export async function streamCoach(messages: Turn[], context: unknown | null, onDelta: (text: string) => void): Promise<AiResult<CoachReply>> {
  if (!isSupabaseConfigured()) return { ok: false, error: 'not_configured' };
  const supabase = await getSupabase();
  const token = (await supabase?.auth.getSession())?.data.session?.access_token;
  if (!supabase || !token) return { ok: false, error: 'signed_out' };
  const doFetch: typeof fetch = Platform.OS === 'web' ? fetch : ((await import('expo/fetch')).fetch as unknown as typeof fetch);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let reply = '';
  try {
    const res = await doFetch(`${env.supabaseUrl}/functions/v1/coach`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, apikey: env.supabaseAnonKey },
      body: JSON.stringify({ messages, context, stream: true, language: currentLanguage() }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const code = await res
        .json()
        .then((b: { error?: string }) => b.error)
        .catch(() => undefined);
      return { ok: false, error: mapStatus(res.status, code) };
    }
    const reader = res.body?.getReader();
    if (!reader) return askCoach(messages, context);
    const decoder = new TextDecoder();
    let buf = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const parsed = parseSse(buf);
      buf = parsed.rest;
      for (const ev of parsed.events) {
        if (ev.t === 'd' && ev.v) {
          reply += ev.v;
          onDelta(reply);
        } else if (ev.t === 'err') return { ok: false, error: ev.code === 'not_configured' ? 'not_configured' : 'provider_error' };
      }
    }
    return reply.trim() ? { ok: true, data: { reply } } : { ok: false, error: 'invalid_response' };
  } catch (e) {
    return { ok: false, error: (e as Error)?.name === 'AbortError' ? 'timeout' : 'offline' };
  } finally {
    clearTimeout(timer);
  }
}
