import { gymDay, kitchenDay, trainingWeek, waterDay, weeklyWeightChange } from './daySummary';
import { emptyAppData, type ActivityLog, type AppData, type FoodLog } from './types';

const food = (id: string, date: string, kcal: number | null, planMealId?: string) =>
  ({
    id,
    date,
    consumedAt: 'x',
    time: '12:00',
    mealType: 'lunch',
    title: id,
    entryMethod: 'manual',
    planMealId,
    createdAt: 'x',
    updatedAt: 'x',
    items: [{ id: `${id}-i`, name: id, quantity: 1, unit: 'portion', nutrition: kcal === null ? null : { kcal, protein: 10, carbs: 20, fat: 5 } }],
  }) as unknown as FoodLog;
const act = (id: string, date: string, type: ActivityLog['type'], durationMin: number) =>
  ({ id, date, type, startTime: '18:00', durationMin, description: '', entryMethod: 'manual', createdAt: 'x', updatedAt: 'x' }) as unknown as ActivityLog;

const D = '2026-11-27';

describe('day summaries', () => {
  const data: AppData = {
    ...emptyAppData(),
    foodLogs: [food('a', D, 500, 'p1'), food('b', D, null), food('c', '2026-11-26', 900)],
    activityLogs: [act('g', D, 'gym', 60), act('w', D, 'outdoor_walk', 30), act('r', '2026-11-25', 'outdoor_run', 25), act('old', '2026-11-10', 'gym', 90)],
    water: [
      { id: 'w1', date: D, ml: 250, at: 'x', source: 'manual', createdAt: 'x' },
      { id: 'w2', date: D, ml: 500, at: 'x', source: 'prime', createdAt: 'x' },
    ],
    plans: {
      [D]: {
        date: D,
        flexibleMeals: false,
        activity: { type: 'gym', time: '18:00', durationMin: 60 },
        updatedAt: 'x',
        meals: [
          { id: 'p1', mealType: 'lunch', title: 'Bowl', items: [] },
          { id: 'p2', mealType: 'dinner', title: 'Pasta', items: [] },
        ],
      },
    },
    recoveryLogs: { '2026-11-24': { date: '2026-11-24' } as never },
  };

  it('kitchen: logged nutrition (missing values stay missing) and still-open planned meals', () => {
    const k = kitchenDay(data, D);
    expect(k.nutrition).toMatchObject({ kcal: 500, estimated: 1, missing: 1 });
    expect(k.mealsLogged).toBe(2);
    expect(k.mealsPlanned).toBe(2);
    expect(k.openMeals.map((m) => m.id)).toEqual(['p2']);
  });

  it('gym: sessions, minutes and types of the day plus the plan', () => {
    expect(gymDay(data, D)).toEqual({ sessions: 2, minutes: 90, types: ['gym', 'outdoor_walk'], rest: false, planned: { type: 'gym', time: '18:00', durationMin: 60 } });
    expect(gymDay(data, '2026-11-24')).toMatchObject({ sessions: 0, rest: true, planned: null });
  });

  it('water: today total and the default guide value', () => {
    expect(waterDay(data, D)).toEqual({ ml: 750, goalMl: 2000 });
  });

  it('training week: last 7 days only, grouped by type', () => {
    const w = trainingWeek(data, D);
    expect(w).toMatchObject({ activeDays: 2, sessions: 3, minutes: 115 });
    expect(w.byType[0]).toEqual({ type: 'gym', sessions: 1, minutes: 60 });
    expect(w.perDay).toHaveLength(7);
    expect(w.perDay[6]).toEqual({ date: D, minutes: 90, rest: false });
    expect(w.perDay.find((d) => d.date === '2026-11-24')?.rest).toBe(true);
  });
});

describe('weekly weight change', () => {
  const w = (date: string, kg: number) => ({ id: date, date, kg, createdAt: 'x', updatedAt: 'x' });
  it('compares the latest entry with the latest one at least 7 days earlier', () => {
    expect(weeklyWeightChange({ weights: [w('2026-11-10', 92), w('2026-11-18', 91.4), w('2026-11-20', 91), w('2026-11-27', 90.2)] })).toBe(-0.8);
  });
  it('is unknown without an entry a week back', () => {
    expect(weeklyWeightChange({ weights: [w('2026-11-25', 91), w('2026-11-27', 90)] })).toBeNull();
    expect(weeklyWeightChange({ weights: [] })).toBeNull();
  });
});
