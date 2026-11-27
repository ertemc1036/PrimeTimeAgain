import { dailyBriefing, type BriefingInput } from './briefing';

const base: BriefingInput = {
  hour: 8,
  kitchen: { nutrition: { kcal: 0, protein: 0, carbs: 0, fat: 0, estimated: 0, missing: 0 }, mealsLogged: 0, openMeals: [], mealsPlanned: 0 },
  gym: { sessions: 0, minutes: 0, types: [], rest: false, planned: null },
  water: { ml: 0, goalMl: 2000 },
  checks: { food: false, activity: false, complete: false },
  tomorrowPlanned: false,
};
const keys = (i: Partial<BriefingInput>) => dailyBriefing({ ...base, ...i }).map((p) => p.key);

describe('Prime daily briefing', () => {
  it('greets by time of day and offers to prepare an empty day', () => {
    expect(dailyBriefing(base)).toEqual([{ key: 'greeting', period: 'morning' }, { key: 'prepareDay' }]);
    expect(dailyBriefing({ ...base, hour: 14 })[0]).toEqual({ key: 'greeting', period: 'afternoon' });
  });

  it('mentions planned training and planned meals that are still open', () => {
    const gym = { ...base.gym, planned: { type: 'gym' as const, time: '18:00', durationMin: 60 } };
    const kitchen = { ...base.kitchen, openMeals: [{ id: 'm', mealType: 'lunch' as const, title: 'Bowl', items: [] }], mealsPlanned: 1 };
    expect(keys({ gym, kitchen })).toEqual(['greeting', 'trainingPlanned', 'mealsOpen']);
  });

  it('reports done training and rest days instead of the plan', () => {
    expect(keys({ gym: { ...base.gym, sessions: 1, minutes: 45, planned: { type: 'gym' } } })).toContain('trainingDone');
    expect(keys({ gym: { ...base.gym, rest: true } })).toContain('restDay');
  });

  it('never lists more than two facts', () => {
    expect(keys({ hour: 19, gym: { ...base.gym, planned: { type: 'home' } } })).toHaveLength(3);
  });

  it('offers planning tomorrow only in the evening, only as an option, and never when the day is complete', () => {
    expect(keys({ hour: 19, kitchen: { ...base.kitchen, mealsLogged: 2 }, water: { ml: 1500, goalMl: 2000 } })).toEqual(['greeting', 'planTomorrow']);
    expect(keys({ hour: 19, kitchen: { ...base.kitchen, mealsLogged: 2 }, water: { ml: 1500, goalMl: 2000 }, tomorrowPlanned: true })).toEqual(['greeting', 'prepareDay']);
    expect(keys({ hour: 19, checks: { food: true, activity: true, complete: true } })).toEqual(['dayComplete']);
  });

  it('celebrates a complete day (food and activity) without asking for anything else', () => {
    expect(keys({ checks: { food: true, activity: true, complete: true } })).toEqual(['dayComplete']);
  });
});
