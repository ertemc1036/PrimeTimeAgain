import { sql } from '../_shared/db.ts';
import { betaAllUsersPro } from '../_shared/entitlement.ts';
import { error, json, preflight } from '../_shared/http.ts';

/**
 * Founders Edition counter: how many of the free Diet9 Pro founder seats are taken. Public (no sign-in
 * needed, deploy with --no-verify-jwt); returns counts only, straight from the database.
 * `beta` tells the app (before sign-in, e.g. in the onboarding) whether the free PrimeMe+ beta
 * (BETA_ALL_USERS_PRO) is running, so turning the secret off changes the app without a new build.
 */
export async function handler(req: Request): Promise<Response> {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== 'GET' && req.method !== 'POST') return error(405, 'method_not_allowed');
  try {
    const [row] = await sql()<{ status: { capacity: number; taken: number } }[]>`select public.founder_seats_status() as status`;
    const { capacity, taken } = row.status;
    const res = json({ capacity, taken: Math.min(taken, capacity), remaining: Math.max(capacity - taken, 0), beta: betaAllUsersPro() });
    res.headers.set('Cache-Control', 'public, max-age=30');
    return res;
  } catch (e) {
    console.error('founders status failed', (e as Error).message);
    return error(500, 'unavailable');
  }
}
