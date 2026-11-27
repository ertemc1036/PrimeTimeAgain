import { consentRecord, hasHealthConsent, healthConsentAnswered, HEALTH_CONSENT_VERSION } from './consent';
import { applyMutation, MutationRejected } from './mutations';
import { emptyAppData, type AppData, type Profile } from './types';

const T = '2026-11-27';
const profile = (extra: Partial<Profile> = {}): Profile => ({
  name: 'Sam',
  adultConfirmed: true,
  units: 'metric',
  goals: ['weight'],
  activityPrefs: [],
  food: { preferred: ['Fish'], restrictions: ['Halal'], allergies: ['Peanuts'], dislikes: ['Olives'] },
  planningTime: '20:30',
  createdAt: 'x',
  onboardingCompletedAt: 'x',
  heightCm: 170,
  startWeightKg: 80,
  goalWeightKg: 72,
  bodySex: 'female',
  healthFlags: ['medication'],
  targets: { kcal: 1800, protein: 110, carbs: 190, fat: 60 },
  waterGoalMl: 2500,
  diet: 'vegetarian',
  ...extra,
});
const onboard = (p: Profile): AppData =>
  applyMutation(emptyAppData(), { type: 'completeOnboarding', profile: p, journey: { programEnabled: true, startDate: T, maintenance: false }, notifications: emptyAppData().notifications }, T);
const weight = { type: 'upsertWeight' as const, entry: { id: 'w1', date: T, kg: 80, createdAt: 'x', updatedAt: 'x' } };

describe('health-data consent', () => {
  it('is only valid for the current version', () => {
    expect(hasHealthConsent({ healthConsent: consentRecord(true, 'x') })).toBe(true);
    expect(hasHealthConsent({ healthConsent: { granted: true, version: '2020-01-01', at: 'x' } })).toBe(false);
    expect(hasHealthConsent({})).toBe(false);
    expect(healthConsentAnswered({ healthConsent: consentRecord(false, 'x') })).toBe(true);
    expect(healthConsentAnswered({ healthConsent: { granted: true, version: 'old', at: 'x' } })).toBe(false);
    expect(consentRecord(true, 'x').version).toBe(HEALTH_CONSENT_VERSION);
  });

  it('without consent no health data is stored at onboarding (data minimisation)', () => {
    const d = onboard(profile({ healthConsent: consentRecord(false, 'x') }));
    const p = d.profile!;
    expect([p.heightCm, p.startWeightKg, p.goalWeightKg, p.bodySex, p.healthFlags, p.targets, p.waterGoalMl]).toEqual([undefined, undefined, undefined, undefined, undefined, undefined, undefined]);
    expect(p.food).toEqual({ preferred: ['Fish'], restrictions: [], allergies: [], dislikes: ['Olives'] });
    expect(p.diet).toBe('vegetarian');
    expect(p.healthConsent?.granted).toBe(false);
  });

  it('blocks weight entries and health fields without consent', () => {
    const d = onboard(profile({ healthConsent: consentRecord(false, 'x') }));
    expect(() => applyMutation(d, weight, T)).toThrow(MutationRejected);
    const next = applyMutation(d, { type: 'updateProfile', patch: { heightCm: 180, name: 'Alex' } }, T);
    expect(next.profile!.heightCm).toBeUndefined();
    expect(next.profile!.name).toBe('Alex');
  });

  it('with consent everything works; withdrawal deletes health data and weights, keeps the rest', () => {
    let d = onboard(profile({ healthConsent: consentRecord(true, 'x') }));
    d = applyMutation(d, weight, T);
    expect(d.weights).toHaveLength(1);
    expect(d.profile!.heightCm).toBe(170);
    d = applyMutation(d, { type: 'setHealthConsent', granted: false, at: 'y' }, T);
    expect(d.weights).toHaveLength(0);
    expect(d.profile!.startWeightKg).toBeUndefined();
    expect(d.profile!.food.allergies).toEqual([]);
    expect(d.profile!.name).toBe('Sam');
    expect(d.profile!.healthConsent).toEqual({ granted: false, version: HEALTH_CONSENT_VERSION, at: 'y' });
    d = applyMutation(d, { type: 'setHealthConsent', granted: true, at: 'z' }, T);
    expect(applyMutation(d, weight, T).weights).toHaveLength(1);
  });
});
