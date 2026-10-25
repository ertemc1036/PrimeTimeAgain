import type { ZodType } from 'zod';

import { isSupabaseConfigured } from '@/config/env';
import { coachReplySchema, foodScanSchema, workoutPhotoSchema, type CoachReply, type FoodScanResult, type WorkoutPhotoResult } from '@/domain/aiSchemas';
import type { WorkoutType } from '@/domain/types';
import { getSupabase } from '@/services/supabase/client';

/**
 * AI calls go ONLY to our Supabase Edge Functions, which hold the AI provider key, verify the
 * user's session and Pro entitlement server-side, rate-limit, and validate model output.
 * When the backend isn't configured the app shows an honest "not available" state.
 */
export type AiError = 'not_configured' | 'signed_out' | 'not_pro' | 'rate_limited' | 'offline' | 'invalid_response' | 'provider_error';
export type AiResult<T> = { ok: true; data: T } | { ok: false; error: AiError };

async function invoke<T>(fn: string, body: Record<string, unknown>, schema: ZodType<T>): Promise<AiResult<T>> {
  if (!isSupabaseConfigured()) return { ok: false, error: 'not_configured' };
  const supabase = await getSupabase();
  if (!supabase) return { ok: false, error: 'not_configured' };
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) return { ok: false, error: 'signed_out' };
  try {
    const { data, error } = await supabase.functions.invoke(fn, { body });
    if (error) {
      const status = (error as { context?: { status?: number } }).context?.status;
      if (status === 401) return { ok: false, error: 'signed_out' };
      if (status === 402 || status === 403) return { ok: false, error: 'not_pro' };
      if (status === 429) return { ok: false, error: 'rate_limited' };
      return { ok: false, error: 'provider_error' };
    }
    const parsed = schema.safeParse(data);
    return parsed.success ? { ok: true, data: parsed.data } : { ok: false, error: 'invalid_response' };
  } catch {
    return { ok: false, error: 'offline' };
  }
}

export const aiAvailable = () => isSupabaseConfigured();

export const scanFood = (imageBase64: string): Promise<AiResult<FoodScanResult>> =>
  invoke('food-scan', { image: imageBase64 }, foodScanSchema);

export const analyzeWorkoutPhoto = (imageBase64: string, selected: WorkoutType): Promise<AiResult<WorkoutPhotoResult>> =>
  invoke('workout-photo', { image: imageBase64, selected }, workoutPhotoSchema);

export const askCoach = (messages: { role: 'user' | 'assistant'; content: string }[], context: unknown | null): Promise<AiResult<CoachReply>> =>
  invoke('coach', { messages, context }, coachReplySchema);
