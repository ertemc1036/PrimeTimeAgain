import { FREE, fromRevenueCat, isPro } from './entitlements';

const now = new Date('2026-10-25T12:00:00Z');
const base = { isActive: true, expirationDate: '2026-11-25T12:00:00Z', billingIssueDetectedAt: null, productIdentifier: 'minus30_pro_monthly' };

describe('entitlements', () => {
  it('free by default', () => {
    expect(fromRevenueCat(undefined)).toEqual(FREE);
    expect(isPro(FREE)).toBe(false);
  });
  it('active subscription is Pro', () => expect(fromRevenueCat(base, now)).toMatchObject({ tier: 'pro', status: 'active' }));
  it('billing issue inside grace period keeps Pro', () =>
    expect(fromRevenueCat({ ...base, billingIssueDetectedAt: '2026-10-24T00:00:00Z' }, now)).toMatchObject({ tier: 'pro', status: 'grace_period' }));
  it('expired subscription loses Pro even if the flag is stale', () =>
    expect(fromRevenueCat({ ...base, expirationDate: '2026-10-01T00:00:00Z' }, now)).toMatchObject({ tier: 'free', status: 'expired' }));
  it('inactive with billing issue reports billing problem', () =>
    expect(fromRevenueCat({ ...base, isActive: false, billingIssueDetectedAt: 'x' }, now)).toMatchObject({ tier: 'free', status: 'billing_issue' }));
});
