import { admin } from '../_shared/guard.ts';
import { error, json } from '../_shared/http.ts';

/**
 * RevenueCat → entitlements. The only writer of Pro status.
 * Configure the webhook in RevenueCat with an Authorization header equal to the
 * REVENUECAT_WEBHOOK_SECRET function secret, and set the RevenueCat app user id to the Supabase user id.
 */
const PRO_ENTITLEMENT = 'pro';

Deno.serve(async (req) => {
  const secret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');
  if (!secret || req.headers.get('Authorization') !== `Bearer ${secret}`) return error(401, 'unauthorized');
  const body = await req.json().catch(() => null);
  const event = body?.event;
  if (!event?.app_user_id || !event?.type) return error(400, 'invalid_event');
  if (!(event.entitlement_ids ?? []).includes(PRO_ENTITLEMENT) && event.type !== 'TRANSFER') return json({ ignored: true });

  const expiresAt = event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null;
  const statusByType: Record<string, string> = {
    INITIAL_PURCHASE: 'active',
    RENEWAL: 'active',
    UNCANCELLATION: 'active',
    PRODUCT_CHANGE: 'active',
    NON_RENEWING_PURCHASE: 'active',
    CANCELLATION: 'active', // still active until it expires
    BILLING_ISSUE: event.grace_period_expiration_at_ms ? 'grace_period' : 'billing_issue',
    SUBSCRIPTION_PAUSED: 'expired',
    EXPIRATION: 'expired',
  };
  const status = statusByType[event.type];
  if (!status) return json({ ignored: true });

  const { error: dbError } = await admin()
    .from('entitlements')
    .upsert({
      user_id: event.app_user_id,
      tier: status === 'expired' || status === 'billing_issue' ? 'free' : 'pro',
      status,
      product_id: event.product_id ?? null,
      expires_at: status === 'grace_period' ? new Date(event.grace_period_expiration_at_ms).toISOString() : expiresAt,
      updated_at: new Date().toISOString(),
    });
  if (dbError) return error(500, 'db_error');
  return json({ ok: true });
});
