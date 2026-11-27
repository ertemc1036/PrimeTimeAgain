import { ageOn, computePlan, type PlanInput } from './plan';

const base: PlanInput = { sex: 'male', birthYear: 1996, heightCm: 184, weightKg: 120, goalWeightKg: 85, workouts: '1-2', goal: 'lose', pace: 'balanced', year: 2026 };

describe('personal plan', () => {
  it('computes energy need with Mifflin-St Jeor and an activity factor', () => {
    const p = computePlan({ ...base, goal: 'maintain' });
    // 10*120 + 6.25*184 - 5*30 + 5 = 2205; × 1.375 = 3032
    expect(p.tdee).toBe(3032);
    expect(p.targets?.kcal).toBe(3030);
    expect(p.weeklyKg).toBeNull();
  });

  it('loses weight with a moderate deficit and a realistic time range', () => {
    const p = computePlan(base);
    expect(p.weeklyKg).toBe(-0.5);
    expect(p.targets!.kcal).toBe(2480); // 3032 − 550
    expect(p.toLoseKg).toBe(35);
    expect(p.weeks!.min).toBeLessThan(p.weeks!.max);
  });

  it('caps the deficit at 25 % of the energy need and 1 % of body weight per week', () => {
    const p = computePlan({ ...base, sex: 'female', weightKg: 70, goalWeightKg: 62, heightCm: 165, workouts: '0', pace: 'custom' });
    expect(p.notes).toContain('limited_by_safety');
    expect(-p.weeklyKg!).toBeLessThanOrEqual(0.7);
    expect(p.targets!.kcal).toBeGreaterThanOrEqual(1200);
    expect(p.targets!.kcal).toBeGreaterThanOrEqual(Math.round(p.tdee! * 0.75) - 10);
  });

  it('never plans a deficit below the calorie floor (stays at the energy need instead)', () => {
    const p = computePlan({ ...base, sex: 'female', birthYear: 1950, weightKg: 52, goalWeightKg: 50, heightCm: 158, workouts: '0', pace: 'custom' });
    expect(p.tdee).toBeLessThan(1200);
    expect(p.weeklyKg).toBe(0);
    expect(p.weeks).toBeNull();
    expect(p.targets!.kcal).toBe(Math.round(p.tdee! / 10) * 10);
  });

  it('plans no deficit for a goal weight below the healthy range', () => {
    const p = computePlan({ ...base, goalWeightKg: 55 });
    expect(p.notes).toContain('goal_unhealthy');
    expect(p.weeklyKg).toBeNull();
    expect(p.targets!.kcal).toBe(3030);
  });

  it('invents no calorie or macro targets without body data', () => {
    const p = computePlan({ ...base, sex: undefined });
    expect(p.tdee).toBeNull();
    expect(p.targets).toBeNull();
    expect(p.notes).toContain('needs_body_data');
  });

  it('splits macros sensibly and bases protein on a healthy reference weight', () => {
    const t = computePlan({ ...base, goal: 'maintain' }).targets!;
    expect(t.protein).toBe(Math.round(1.6 * 25 * 1.84 ** 2));
    expect(t.protein * 4 + t.carbs * 4 + t.fat * 9).toBeGreaterThan(t.kcal - 20);
    expect(t.protein * 4 + t.carbs * 4 + t.fat * 9).toBeLessThan(t.kcal + 20);
  });

  it('gives a bounded water guide value', () => {
    expect(computePlan({ ...base, weightKg: 120 }).waterMl).toBe(3000);
    expect(computePlan({ ...base, weightKg: 45 }).waterMl).toBe(1500);
    expect(computePlan({ ...base, weightKg: undefined }).waterMl).toBe(2000);
  });

  it('checks the 18+ age exactly to the day', () => {
    expect(ageOn({ year: 2008, month: 11, day: 27 }, new Date(2026, 10, 27))).toBe(18);
    expect(ageOn({ year: 2008, month: 11, day: 28 }, new Date(2026, 10, 27))).toBe(17);
  });
});
