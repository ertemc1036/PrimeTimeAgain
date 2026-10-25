import { fetchSubscriber, fromSubscriber, saveEntitlement, type EntitlementRow, PRO_ENTITLEMENT_ID } from '../_shared/entitlement.ts';
import { error, json } from '../_shared/http.ts';

/**
 * RevenueCat → entitlements. Configure the webhook with header `Authorization: Bearer <REVENUECAT_WEBHOOK_SECRET>`
 * and use the Supabase user id as RevenueCat app user id. When REVENUECAT_SECRET_KEY is set, every event
 * triggers a fetch of the authoritative subscriber state; otherwise the event itself is mapped.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Fallback mapping when the REST API isn't configured (pure; unit-tested). */
export function fromEvent(event: Record<string, unknown>, now = new Date()): EntitlementRow | null {
  const type = String(event.type);
  const ids = (event.entitlement_ids as string[] | undefined) ?? [];
  if (!ids.includes(PRO_ENTITLEMENT_ID)) return null;
  const expires = event.expiration_at_ms ? new Date(Number(event.expiration_at_ms)) : null;
  const grace = event.grace_period_expiration_at_ms ? new Date(Number(event.grace_period_expiration_at_ms)) : null;
  const base = { product_id: (event.product_id as string) ?? null, store: (event.store as string) ?? null };
  switch (type) {
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
    case 'UNCANCELLATION':
    case 'PRODUCT_CHANGE':
    case 'NON_RENEWING_PURCHASE':
    case 'CANCELLATION': // stays active until it expires
    case 'SUBSCRIPTION_EXTENDED':
      return { ...base, tier: !expires || expires > now ? 'pro' : 'free', status: !expires || expires > now ? 'active' : 'expired', expires_at: expires?.toISOString() ?? null };
    case 'BILLING_ISSUE':
      return grace && grace > now
        ? { ...base, tier: 'pro', status: 'grace_period', expires_at: grace.toISOString() }
        : { ...base, tier: 'free', status: 'billing_issue', expires_at: expires?.toISOString() ?? null };
    case 'EXPIRATION':
    case 'SUBSCRIPTION_PAUSED':
      return { ...base, tier: 'free', status: 'expired', expires_at: expires?.toISOString() ?? null };
    default:
      return null;
  }
}

export async function handler(req: Request): Promise<Response> {
  const secret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');
  if (!secret || req.headers.get('Authorization') !== `Bearer ${secret}`) return error(401, 'unauthorized');
  const body = await req.json().catch(() => null);
  const event = body?.event as Record<string, unknown> | undefined;
  if (!event?.type) return error(400, 'invalid_event');

  const users = new Set<string>(
    [event.app_user_id, event.original_app_user_id, ...((event.transferred_to as string[]) ?? []), ...((event.transferred_from as string[]) ?? [])].filter(
      (id): id is string => typeof id === 'string' && UUID.test(id),
    ),
  );
  if (!users.size) return json({ ignored: 'no_known_user' });

  const updated: string[] = [];
  for (const userId of users) {
    let row: EntitlementRow | null = null;
    try {
      const sub = await fetchSubscriber(userId);
      row = sub ? fromSubscriber(sub) : null;
    } catch {
      return error(502, 'revenuecat_unreachable'); // RevenueCat retries the webhook later
    }
    row ??= event.type === 'TRANSFER' ? null : fromEvent(event);
    if (!row) continue;
    try {
      await saveEntitlement(userId, row);
      updated.push(userId);
    } catch (e) {
      if ((e as { code?: string }).code === '23503') continue; // not a MINUS 30 user (yet)
      return error(500, 'db_error');
    }
  }
  return json({ ok: true, updated: updated.length });
}
