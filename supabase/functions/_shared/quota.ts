import { sql } from './db.ts';

/** Per-user limits for AI functions: requests per minute and per rolling 24 hours. */
export const LIMITS: Record<string, { perMinute: number; perDay: number }> = {
  'food-scan': { perMinute: 6, perDay: 30 },
  'workout-photo': { perMinute: 6, perDay: 20 },
  coach: { perMinute: 10, perDay: 60 },
};

/**
 * Cost brake across all users: at most this many requests per AI function in 24 hours
 * (AI_GLOBAL_DAILY_LIMIT secret, default 2000). Protects the AI budget against abuse or bugs.
 */
export const globalDailyLimit = () => {
  const n = Number(Deno.env.get('AI_GLOBAL_DAILY_LIMIT'));
  return Number.isFinite(n) && n > 0 ? n : 2000;
};

/**
 * Atomically check and record one AI request. A per-user advisory lock serialises concurrent calls,
 * so parallel requests can't slip past the limit.
 */
export async function consumeQuota(userId: string, fn: string): Promise<boolean> {
  const limit = LIMITS[fn] ?? { perMinute: 5, perDay: 20 };
  return (await sql().begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(hashtext(${userId + ':' + fn}))`;
    const [{ minute, day }] = await tx<{ minute: number; day: number }[]>`
      select count(*) filter (where created_at > now() - interval '1 minute')::int as minute,
             count(*)::int as day
      from public.ai_usage where user_id = ${userId} and fn = ${fn} and created_at > now() - interval '24 hours'`;
    if (minute >= limit.perMinute || day >= limit.perDay) return false;
    const [{ total }] = await tx<{ total: number }[]>`
      select count(*)::int as total from public.ai_usage where fn = ${fn} and created_at > now() - interval '24 hours'`;
    if (total >= globalDailyLimit()) return false;
    await tx`insert into public.ai_usage (user_id, fn) values (${userId}, ${fn})`;
    return true;
  })) as boolean;
}
