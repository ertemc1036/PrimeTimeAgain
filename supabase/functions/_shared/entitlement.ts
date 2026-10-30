import { sql } from './db.ts';

export interface EntitlementRow {
  tier: 'free' | 'pro';
  status: 'active' | 'grace_period' | 'billing_issue' | 'expired' | 'none';
  product_id: string | null;
  store: string | null;
  expires_at: string | null;
  updated_at?: string;
  /** Only for Founders Pro (never stored in public.entitlements). */
  founder_seat?: number;
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
 * Founders Edition: the first verified accounts (capacity in public.founder_settings, 1,000) own a
 * permanent, free founder seat in public.founder_seats. The database hands seats out when an account
 * is verified; this call also claims one if that trigger was missed (idempotent, same rules).
 */
export async function founderSeat(userId: string): Promise<number | null> {
  try {
    const [row] = await sql()<{ seat: number | null }[]>`select public.claim_founder_seat(${userId}::uuid) as seat`;
    return row?.seat ?? null;
  } catch (e) {
    // e.g. the founder migration isn't applied yet: no founder seat, everything else keeps working.
    console.error('founder seat check failed', (e as Error).message);
    return null;
  }
}

const FOUNDER = (seat: number): EntitlementRow => ({ tier: 'pro', status: 'active', product_id: null, store: 'founder', expires_at: null, founder_seat: seat });

/**
 * Current entitlement, decided on the server only. Order: Paid Pro (RevenueCat-verified store
 * subscription) → Test Pro (PRO_TESTERS secret) → Founders Pro (stored founder seat). Duo Guest
 * (a friend seat of a paying subscriber) is planned and not granted anywhere yet.
 */
export async function currentEntitlement(userId: string, opts: { force?: boolean; maxAgeMs?: number } = {}): Promise<EntitlementRow> {
  const paid = await storeEntitlement(userId, opts);
  if (isProActive(paid)) return paid;
  if (isTester(userId)) return { tier: 'pro', status: 'active', product_id: null, store: 'test', expires_at: null };
  const seat = await founderSeat(userId);
  return seat ? FOUNDER(seat) : paid;
}

/** Where Pro comes from. 'duo_guest' is reserved for the planned friend seat. */
export type ProSource = 'store' | 'test' | 'founder' | 'duo_guest';

export const publicEntitlement = (e: EntitlementRow) => ({
  tier: isProActive(e) ? 'pro' : 'free',
  status: e.status,
  expiresAt: e.expires_at,
  productId: e.product_id,
  /** Where Pro comes from: store subscription (Paid Pro), developer test access or a founder seat. */
  source: (!isProActive(e) ? null : e.store === 'test' ? 'test' : e.store === 'founder' ? 'founder' : 'store') as ProSource | null,
  /** Founder seat number (1..1000) when Pro comes from the Founders Edition. */
  founderSeat: isProActive(e) && e.store === 'founder' ? (e.founder_seat ?? null) : null,
});

/** Proven identity (Sign in with Apple, or email confirmed with a code); false if unknown. */
export async function identityProven(userId: string): Promise<boolean> {
  try {
    const [row] = await sql()<{ proven: boolean }[]>`select public.identity_proven(${userId}::uuid) as proven`;
    return row?.proven === true;
  } catch (e) {
    // e.g. the identity migration isn't applied yet
    console.error('identity proof check failed', (e as Error).message);
    return false;
  }
}

/** What the app gets: the public entitlement plus whether the account's identity is proven. */
export async function accountEntitlement(userId: string, opts: { force?: boolean } = {}) {
  const [e, verified] = await Promise.all([currentEntitlement(userId, opts), identityProven(userId)]);
  return { ...publicEntitlement(e), identityVerified: verified };
}
