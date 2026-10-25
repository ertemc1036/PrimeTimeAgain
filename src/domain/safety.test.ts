import { newlyEarned } from './achievements';
import { checkGoalWeight, kgToLb, lbToKg } from './goals';
import { journeyPosition } from './journey';
import { searchFoods, totals, itemFromFood } from './nutrition';
import { emptyAppData } from './types';

describe('goal safeguards', () => {
  it('flags goals below a healthy BMI and implausible values', () => {
    expect(checkGoalWeight(45, 80, 175)).toMatchObject({ ok: false, reason: 'underweight', minHealthyKg: 57 });
    expect(checkGoalWeight(70, 80, 175)).toEqual({ ok: true });
    expect(checkGoalWeight(10)).toMatchObject({ ok: false, reason: 'invalid' });
    expect(checkGoalWeight(65, 100, 175)).toMatchObject({ ok: false, reason: 'large_change' });
  });
  it('converts units', () => {
    expect(kgToLb(80)).toBe(176.4);
    expect(lbToKg(176.4)).toBe(80);
  });
});

describe('nutrition', () => {
  it('scales reference values and never invents missing data', () => {
    const rice = itemFromFood('1', 'rice_white', 1, 'cup')!;
    expect(rice.nutrition).toEqual({ kcal: 205, protein: 4.3, carbs: 44.6, fat: 0.5 });
    const chicken = itemFromFood('2', 'chicken_breast', 150, 'g')!;
    expect(chicken.nutrition?.protein).toBe(46.5);
    const unknownUnit = itemFromFood('3', 'chicken_breast', 1, 'bucket')!;
    expect(unknownUnit.nutrition).toBeNull();
    const t = totals([rice, chicken, unknownUnit]);
    expect(t).toMatchObject({ kcal: 453, estimated: 2, missing: 1 });
  });
  it('searches by prefix and word', () => {
    expect(searchFoods('chick').foods.map((f) => f.id)).toEqual(expect.arrayContaining(['chicken_breast', 'chickpeas']));
    expect(searchFoods('rice').foods[0].id).toBe('rice_cake');
    expect(searchFoods('zzzz').foods).toEqual([]);
  });
});

describe('seven-month journey', () => {
  it('moves through calendar months and finishes after seven', () => {
    expect(journeyPosition('2026-01-31', '2026-01-31')).toMatchObject({ month: 1, dayNumber: 1, finished: false });
    expect(journeyPosition('2026-01-31', '2026-02-28').month).toBe(2);
    expect(journeyPosition('2026-01-31', '2026-08-31')).toMatchObject({ month: 8, finished: true, progress: 1 });
  });
});

describe('achievements', () => {
  it('are earned once and kept', () => {
    const d = { ...emptyAppData(), plans: { '2026-10-26': { date: '2026-10-26', meals: [], flexibleMeals: true, activity: { type: 'rest' as const }, savedAt: 'x', updatedAt: 'x' } } };
    const earned = newlyEarned(d, '2026-10-25', 'now');
    expect(earned.map((a) => a.id)).toEqual(['first_plan']);
    expect(newlyEarned({ ...d, achievements: earned }, '2026-10-25', 'now')).toEqual([]);
  });
});
