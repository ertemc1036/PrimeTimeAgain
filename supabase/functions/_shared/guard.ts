import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.118.0';

import { error } from './http.ts';

/** Daily request limits per user and function (cost control). */
const DAILY_LIMITS: Record<string, number> = { 'food-scan': 30, 'workout-photo': 20, coach: 60 };

export const admin = (): SupabaseClient =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

/**
 * Verify the caller's session, their Pro entitlement (from the server-side table written only by
 * the store webhook — never from anything the app sends) and the daily rate limit.
 * Returns the user id, or an error Response.
 */
export async function requirePro(req: Request, fn: string): Promise<{ userId: string } | Response> {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return error(401, 'signed_out');
  const db = admin();
  const { data: auth, error: authError } = await db.auth.getUser(token);
  if (authError || !auth.user) return error(401, 'signed_out');
  const userId = auth.user.id;

  const { data: ent } = await db.from('entitlements').select('tier,status,expires_at').eq('user_id', userId).maybeSingle();
  const activeStatus = ent?.status === 'active' || ent?.status === 'grace_period';
  const notExpired = !ent?.expires_at || new Date(ent.expires_at).getTime() > Date.now();
  if (!ent || ent.tier !== 'pro' || !activeStatus || !notExpired) return error(403, 'not_pro');

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await db.from('ai_usage').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('fn', fn).gte('created_at', since);
  if ((count ?? 0) >= (DAILY_LIMITS[fn] ?? 20)) return error(429, 'rate_limited');
  await db.from('ai_usage').insert({ user_id: userId, fn });
  return { userId };
}

/** Rough base64 image check: JPEG only, max ~4 MB. */
export const validImage = (b64: unknown): b64 is string => typeof b64 === 'string' && b64.length > 100 && b64.length < 5_600_000 && b64.startsWith('/9j/');
