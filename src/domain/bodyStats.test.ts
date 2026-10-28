import { weightProgress } from './bodyStats';
import type { Profile, WeightEntry } from './types';

const profile = (p: Partial<Profile>) => ({ name: 'A', adultConfirmed: true, units: 'metric', goals: [], activityPrefs: [], food: {}, planningTime: '20:00', createdAt: '', onboardingCompletedAt: '', ...p }) as unknown as Profile;
const w = (date: string, kg: number): WeightEntry => ({ id: date, date, kg, createdAt: date, updatedAt: date });

describe('weightProgress', () => {
  it('is empty without any weight data', () => {
    expect(weightProgress({ profile: profile({}), weights: [] })).toEqual({ startKg: null, currentKg: null, currentDate: null, changeKg: null, goalKg: null, progress: null, remainingKg: null });
  });

  it('uses the profile start weight and the latest entry by date', () => {
    const r = weightProgress({ profile: profile({ startWeightKg: 92, goalWeightKg: 82 }), weights: [w('2026-10-20', 89.4), w('2026-10-01', 91), w('2026-10-27', 88.6)] });
    expect(r).toMatchObject({ startKg: 92, currentKg: 88.6, currentDate: '2026-10-27', changeKg: -3.4, goalKg: 82, remainingKg: 6.6 });
    expect(r.progress).toBeCloseTo(0.34);
  });

  it('falls back to the first entry as start and reports no change without entries', () => {
    expect(weightProgress({ profile: profile({}), weights: [w('2026-10-01', 70), w('2026-10-10', 71.2)] })).toMatchObject({ startKg: 70, currentKg: 71.2, changeKg: 1.2, progress: null });
    expect(weightProgress({ profile: profile({ startWeightKg: 80 }), weights: [] })).toMatchObject({ startKg: 80, currentKg: 80, changeKg: 0, currentDate: null });
  });

  it('handles gain goals and clamps progress to 0..1', () => {
    expect(weightProgress({ profile: profile({ startWeightKg: 60, goalWeightKg: 65 }), weights: [w('2026-10-01', 62.5)] }).progress).toBeCloseTo(0.5);
    expect(weightProgress({ profile: profile({ startWeightKg: 90, goalWeightKg: 80 }), weights: [w('2026-10-01', 93)] }).progress).toBe(0);
    expect(weightProgress({ profile: profile({ startWeightKg: 90, goalWeightKg: 80 }), weights: [w('2026-10-01', 78)] }).progress).toBe(1);
  });

  it('has no progress ratio when start equals goal (maintenance)', () => {
    expect(weightProgress({ profile: profile({ startWeightKg: 75, goalWeightKg: 75 }), weights: [w('2026-10-01', 75.4)] })).toMatchObject({ progress: null, remainingKg: 0.4 });
  });
});
