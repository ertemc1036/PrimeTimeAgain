import { sql } from './db.ts';

export interface EntitlementRow {
  tier: 'free' | 'pro';
  status: 'active' | 'grace_period' | 'billing_issue' | 'expired' | 'none';
  product_id: string | null;
  store: string | null;
  expires_at: string | null;
  updated_at?: string;
}

export const FREE: EntitlementRow = { tier: 'free', status: 'none', product_id: null, store: null, expires_at: null };
export const PRO_ENTITLEMENT_ID = 'pro';

export function isProActive(e: EntitlementRow | null | undefined, now = new Date()): boolean {
  if (!e || e.tier !== 'pro') return false;
  if (e.status !== 'active' && e.status !== 'grace_period') return false;
  return !e.expires_at || new Date(e.expires_at).getTime() > now.getTime();
}

interface RcEntitlement {
  expires_date: string | null;
  grace_period_expires_date?: string | null;
  product_identifier: string;
}
interface RcSubscription {
  store?: string;
  billing_issues_detected_at?: string | null;
  unsubscribe_detected_at?: string | null;
  expires_date?: string | null;
  grace_period_expires_date?: string | null;
}
export interface RcSubscriber {
  entitlements?: Record<string, RcEntitlement>;
  subscriptions?: Record<string, RcSubscription>;
}

/** Map RevenueCat's subscriber object to our entitlement row (pure; unit-tested). */
export function fromSubscriber(sub: RcSubscriber | undefined, now = new Date()): EntitlementRow {
  const ent = sub?.entitlements?.[PRO_ENTITLEMENT_ID];
  if (!ent) return FREE;
  const s = sub?.subscriptions?.[ent.product_identifier];
  const expires = ent.expires_date ? new Date(ent.expires_date) : null; // null = lifetime
  const grace = ent.grace_period_expires_date ?? s?.grace_period_expires_date ?? null;
  const inGrace = !!grace && new Date(grace) > now;
  const active = !expires || expires > now;
  const base = { product_id: ent.product_identifier, store: s?.store ?? null };
  if (active) return { ...base, tier: 'pro', status: s?.billing_issues_detected_at ? 'grace_period' : 'active', expires_at: expires?.toISOString() ?? null };
  if (inGrace) return { ...base, tier: 'pro', status: 'grace_period', expires_at: new Date(grace!).toISOString() };
  return { ...base, tier: 'free', status: s?.billing_issues_detected_at ? 'billing_issue' : 'expired', expires_at: expires?.toISOString() ?? null };
}

/** Fetch the authoritative subscriber state from RevenueCat's REST API (secret key stays on the server). */
export async function fetchSubscriber(userId: string): Promise<RcSubscriber | null> {
  const key = Deno.env.get('REVENUECAT_SECRET_KEY');
  if (!key) return null;
  const base = Deno.env.get('REVENUECAT_API_URL') ?? 'https://api.revenuecat.com';
  const res = await fetch(`${base}/v1/subscribers/${encodeURIComponent(userId)}`, {
    headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`revenuecat ${res.status}`);
  const body = await res.json();
  return body?.subscriber ?? null;
}

export async function saveEntitlement(userId: string, e: EntitlementRow) {
  await sql()`
    insert into public.entitlements (user_id, tier, status, product_id, store, expires_at, updated_at)
    values (${userId}, ${e.tier}, ${e.status}, ${e.product_id}, ${e.store}, ${e.expires_at}, now())
    on conflict (user_id) do update set tier = excluded.tier, status = excluded.status, product_id = excluded.product_id,
      store = excluded.store, expires_at = excluded.expires_at, updated_at = now()`;
}

export async function readEntitlement(userId: string): Promise<EntitlementRow | null> {
  const rows = await sql()<EntitlementRow[]>`select tier, status, product_id, store, expires_at, updated_at from public.entitlements where user_id = ${userId}`;
  const r = rows[0];
  return r ? { ...r, expires_at: r.expires_at ? new Date(r.expires_at).toISOString() : null } : null;
}

/**
 * Current entitlement. Uses the stored row (kept fresh by the webhook) and re-checks RevenueCat when
 * the row is missing/inactive and older than `maxAgeMs`, or when `force` is set (after a purchase/restore).
 */
async function storeEntitlement(userId: string, opts: { force?: boolean; maxAgeMs?: number } = {}): Promise<EntitlementRow> {
  const stored = await readEntitlement(userId);
  const age = stored?.updated_at ? Date.now() - new Date(stored.updated_at).getTime() : Infinity;
  const stale = !isProActive(stored) && age > (opts.maxAgeMs ?? 10 * 60 * 1000);
  if (opts.force || stale || (isProActive(stored) && stored?.expires_at && new Date(stored.expires_at) < new Date())) {
    try {
      const sub = await fetchSubscriber(userId);
      if (sub) {
        const fresh = fromSubscriber(sub);
        await saveEntitlement(userId, fresh);
        return fresh;
      }
    } catch {
      // RevenueCat unreachable: fall back to the stored row.
    }
  }
  return stored ?? FREE;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Developer test access: user ids listed in the PRO_TESTERS secret (comma or space separated UUIDs)
 * get Pro without a purchase. Server-side only — there is no code or switch in the app, nothing is
 * written to the database, and removing an id from the secret ends the access at the next request.
 */
export function isTester(userId: string): boolean {
  const ids = (Deno.env.get('PRO_TESTERS') ?? '')
    .split(/[\s,;]+/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => UUID.test(s));
  return ids.includes(userId.toLowerCase());
}

/**
 * Optional launch phase (off unless INTRO_PRO_FIRST_USERS is set): the first N registered accounts
 * get Pro free, optionally until INTRO_PRO_UNTIL (ISO date). No purchase is involved.
 */
export async function introAccess(userId: string, now = new Date()): Promise<EntitlementRow | null> {
  const n = Number(Deno.env.get('INTRO_PRO_FIRST_USERS'));
  if (!Number.isInteger(n) || n <= 0) return null;
  const untilRaw = Deno.env.get('INTRO_PRO_UNTIL');
  const until = untilRaw ? new Date(untilRaw) : null;
  if (until && !(until.getTime() > now.getTime())) return null;
  const [row] = await sql()<{ rank: number | null }[]>`
    select (select count(*)::int from auth.users u where u.created_at <= me.created_at) as rank
    from auth.users me where me.id = ${userId}`;
  if (!row?.rank || row.rank > n) return null;
  return { tier: 'pro', status: 'active', product_id: null, store: 'intro', expires_at: until ? until.toISOString() : null };
}

/**
 * Current entitlement: a paid (RevenueCat-verified) subscription first, then developer test access,
 * then the optional launch phase.
 */
export async function currentEntitlement(userId: string, opts: { force?: boolean; maxAgeMs?: number } = {}): Promise<EntitlementRow> {
  const paid = await storeEntitlement(userId, opts);
  if (isProActive(paid)) return paid;
  if (isTester(userId)) return { tier: 'pro', status: 'active', product_id: null, store: 'test', expires_at: null };
  return (await introAccess(userId)) ?? paid;
}

export const publicEntitlement = (e: EntitlementRow) => ({
  tier: isProActive(e) ? 'pro' : 'free',
  status: e.status,
  expiresAt: e.expires_at,
  productId: e.product_id,
  /** Where Pro comes from: a store subscription, developer test access or the launch phase. */
  source: !isProActive(e) ? null : e.store === 'test' ? 'test' : e.store === 'intro' ? 'intro' : 'store',
});
