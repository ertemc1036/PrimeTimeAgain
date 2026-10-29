/** Unit tests for pure server logic (no services needed): deno test supabase/tests/logic.test.ts */
import { assert, assertEquals } from 'jsr:@std/assert@1';

import { buildMessages } from '../functions/coach/handler.ts';
import { fromSubscriber, isProActive, isTester, type RcSubscriber } from '../functions/_shared/entitlement.ts';
import { sanitizeScan } from '../functions/food-scan/handler.ts';
import { canonical, validateChange } from '../functions/_shared/records.ts';
import { fromEvent } from '../functions/revenuecat-webhook/handler.ts';

const NOW = new Date('2026-10-26T12:00:00Z');
const days = (n: number) => new Date(NOW.getTime() + n * 86400000).toISOString();

Deno.test('RevenueCat subscriber → entitlement', () => {
  const sub = (ent: Record<string, unknown> | null, s: Record<string, unknown> = {}) =>
    ({
      entitlements: ent ? { pro: { product_identifier: 'minus30_pro_yearly', ...ent } } : {},
      subscriptions: { minus30_pro_yearly: { store: 'play_store', ...s } },
    }) as RcSubscriber;
  assertEquals(fromSubscriber(sub(null), NOW).tier, 'free');
  const active = fromSubscriber(sub({ expires_date: days(10) }), NOW);
  assertEquals([active.tier, active.status, active.store], ['pro', 'active', 'play_store']);
  assert(isProActive(active, NOW));
  const grace = fromSubscriber(sub({ expires_date: days(-1), grace_period_expires_date: days(2) }, { billing_issues_detected_at: days(-1) }), NOW);
  assertEquals([grace.tier, grace.status], ['pro', 'grace_period']);
  assert(isProActive(grace, NOW));
  const billing = fromSubscriber(sub({ expires_date: days(-1) }, { billing_issues_detected_at: days(-3) }), NOW);
  assertEquals([billing.tier, billing.status], ['free', 'billing_issue']);
  assert(!isProActive(billing, NOW));
  assertEquals(fromSubscriber(sub({ expires_date: days(-1) }), NOW).status, 'expired');
  assert(isProActive(fromSubscriber(sub({ expires_date: null }), NOW), NOW), 'lifetime');
  assert(!isProActive({ tier: 'pro', status: 'active', expires_at: days(-1), product_id: null, store: null }, NOW), 'stale row expires on its own');
});

Deno.test('webhook event fallback mapping', () => {
  const ev = (type: string, extra: Record<string, unknown> = {}) => ({ type, entitlement_ids: ['pro'], expiration_at_ms: Date.parse(days(30)), ...extra });
  assertEquals(fromEvent(ev('INITIAL_PURCHASE'), NOW)?.tier, 'pro');
  assertEquals(fromEvent(ev('CANCELLATION'), NOW)?.tier, 'pro', 'cancelled stays active until expiry');
  assertEquals(fromEvent(ev('EXPIRATION'), NOW)?.tier, 'free');
  assertEquals(fromEvent(ev('BILLING_ISSUE', { grace_period_expiration_at_ms: Date.parse(days(2)) }), NOW)?.status, 'grace_period');
  assertEquals(fromEvent(ev('BILLING_ISSUE'), NOW)?.status, 'billing_issue');
  assertEquals(fromEvent({ type: 'INITIAL_PURCHASE', entitlement_ids: ['other'] }, NOW), null);
});

Deno.test('change validation', () => {
  const t = '2026-10-25T10:00:00.000Z';
  const now = Date.parse('2026-10-26T00:00:00Z');
  assertEquals(validateChange({ collection: 'rest', id: '2026-10-25', data: {}, deleted: false, updatedAt: t }, now), null);
  assertEquals(validateChange({ collection: 'rest', id: 'today', data: {}, deleted: false, updatedAt: t }, now), 'date');
  assertEquals(validateChange({ collection: 'activity', id: 'a', data: { type: 'gym', date: '2026-10-25', startTime: '18:00', durationMin: 0, description: 'xx' }, deleted: false, updatedAt: t }, now), 'activity');
  assertEquals(validateChange({ collection: 'profile', id: 'me', data: { name: 'A', adultConfirmed: false }, deleted: false, updatedAt: t }, now), 'profile');
  assertEquals(validateChange({ collection: 'food', id: 'x y', data: {}, deleted: false, updatedAt: t }, now), 'id');
  assertEquals(validateChange({ collection: 'food', id: 'f', data: null, deleted: true, updatedAt: t }, now), null, 'tombstones need no data');
  assertEquals(validateChange({ collection: 'food', id: 'f', data: {}, deleted: false, updatedAt: '2027-01-01T00:00:00Z' }, now), 'updatedAt');
});

Deno.test('canonical JSON is key-order independent', () => {
  assertEquals(canonical({ b: 1, a: [{ d: 2, c: 3 }] }), canonical({ a: [{ c: 3, d: 2 }], b: 1 }));
});

Deno.test('coach conversation is normalised and context is attached last', () => {
  const m = buildMessages([{ role: 'assistant', content: 'x' }, { role: 'user', content: 'a' }, { role: 'user', content: 'b' }, { role: 'system', content: 'evil' }, { role: 'user', content: '' }], { goals: ['habits'] });
  assertEquals(m.length, 1);
  assert((m[0].content as string).startsWith('<app_context>'));
  assert((m[0].content as string).endsWith('a\n\nb'));
  assertEquals(buildMessages([{ role: 'assistant', content: 'only' }], null).length, 0);
});

Deno.test('food scan: unclear or empty results never carry numbers; values are rounded', () => {
  const item = { name: 'Rice', estimatedGrams: 180.4, kcal: 233.6, protein: 4.96, carbs: 51.04, fat: 0.44, confidence: 'medium' as const };
  const base = { mealTitle: 'Rice', confidence: 'low' as const, uncertaintyNotes: [] };
  assertEquals(sanitizeScan({ ...base, status: 'unclear', items: [item] }).items, []);
  assertEquals(sanitizeScan({ ...base, status: 'not_food', items: [item] }).items, []);
  assertEquals(sanitizeScan({ ...base, status: 'ok', items: [] }).status, 'unclear');
  assertEquals(sanitizeScan({ ...base, status: 'ok', items: [item] }).items[0], { ...item, estimatedGrams: 180, kcal: 234, protein: 5, carbs: 51, fat: 0.4 });
});

Deno.test('Pro test access: only valid UUIDs from the PRO_TESTERS secret', () => {
  const id = '3f2b8c1e-7a4d-4e5f-9b6a-1c2d3e4f5a6b';
  Deno.env.delete('PRO_TESTERS');
  assertEquals(isTester(id), false);
  Deno.env.set('PRO_TESTERS', `*, true, ${id.toUpperCase()};`);
  assertEquals(isTester(id), true);
  assertEquals(isTester('00000000-0000-4000-8000-000000000000'), false);
  Deno.env.set('PRO_TESTERS', '*');
  assertEquals(isTester(id), false, 'no wildcard');
  Deno.env.delete('PRO_TESTERS');
});
