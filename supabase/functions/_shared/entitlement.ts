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
export async function currentEntitlement(userId: string, opts: { force?: boolean; maxAgeMs?: number } = {}): Promise<EntitlementRow> {
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

export const publicEntitlement = (e: EntitlementRow) => ({
  tier: isProActive(e) ? 'pro' : 'free',
  status: e.status,
  expiresAt: e.expires_at,
  productId: e.product_id,
});
