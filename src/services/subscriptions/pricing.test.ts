import { planOf } from './entitlements';
import { yearlySaving } from './revenuecat';

describe('yearly saving from real store prices', () => {
  it('computes the German reference prices (9,99 € / 69,99 €)', () => {
    const s = yearlySaving({ amount: 9.99, currency: 'EUR' }, { amount: 69.99, currency: 'EUR' })!;
    expect(s.perMonth).toBeCloseTo(5.8325, 4);
    expect(s.saved).toBeCloseTo(49.89, 2);
    expect(s.percent).toBe(41);
  });
  it('shows no saving when it cannot be computed honestly', () => {
    expect(yearlySaving({ amount: 9.99, currency: 'EUR' }, { amount: 69.99, currency: 'USD' })).toBeNull();
    expect(yearlySaving({ amount: 5, currency: 'EUR' }, { amount: 70, currency: 'EUR' })).toBeNull();
    expect(yearlySaving(undefined, { amount: 69.99, currency: 'EUR' })).toBeNull();
  });
  it('maps product ids to plans', () => {
    expect(planOf('minus30_pro_yearly')).toBe('yearly');
    expect(planOf('minus30_pro_monthly')).toBe('monthly');
    expect(planOf(null)).toBeNull();
  });
});
