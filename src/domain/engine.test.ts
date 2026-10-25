import { calendarStatus, canEditCheckIns, dayChecks, isPlanComplete, journeyStats, streakStats } from './completion';
import { addDays, daysBetween, isWithinWindow } from './dates';
import { applyMutation, MutationRejected, type Mutation } from './mutations';
import { planReminders } from './reminders';
import { emptyAppData, type ActivityLog, type AppData, type DayPlan, type FoodLog, type Profile } from './types';
import { validateWorkout } from './validation';

const TODAY = '2026-10-25'; // DST ends in Europe on this date
const NOW = '2026-10-25T09:00:00.000Z';

const profile: Profile = {
  name: 'Sam',
  adultConfirmed: true,
  units: 'metric',
  goals: ['habits'],
  activityPrefs: ['gym'],
  food: { preferred: [], restrictions: [], allergies: [], dislikes: [] },
  planningTime: '20:00',
  createdAt: '2026-10-01T10:00:00.000Z',
  onboardingCompletedAt: '2026-10-01T10:00:00.000Z',
};
const base = (): AppData => ({ ...emptyAppData(), profile });

const food = (date: string, id = `f-${date}-${Math.random()}`): FoodLog => ({
  id,
  date,
  consumedAt: `${date}T12:00:00.000Z`,
  time: '12:00',
  mealType: 'lunch',
  title: 'Chicken and rice',
  items: [],
  entryMethod: 'manual',
  createdAt: NOW,
  updatedAt: NOW,
});
const workout = (date: string, over: Partial<ActivityLog> = {}): ActivityLog => ({
  id: `w-${date}-${Math.random()}`,
  date,
  type: 'gym',
  startTime: '21:30',
  durationMin: 45,
  description: 'Strength training',
  entryMethod: 'manual',
  createdAt: NOW,
  updatedAt: NOW,
  ...over,
});
const plan = (date: string, over: Partial<DayPlan> = {}): DayPlan => ({
  date,
  meals: [{ id: 'm1', mealType: 'breakfast', title: 'Oatmeal', items: [] }],
  flexibleMeals: false,
  activity: { type: 'gym', time: '21:30', durationMin: 45 },
  savedAt: NOW,
  savedOn: date,
  updatedAt: NOW,
  ...over,
});

/** Build a fully complete day directly (bypassing the grace window, for history fixtures). */
const completeDay = (d: AppData, date: string): AppData => ({
  ...d,
  foodLogs: [...d.foodLogs, food(date)],
  foodCompletions: { ...d.foodCompletions, [date]: { date, completedAt: NOW } },
  activityLogs: [...d.activityLogs, workout(date)],
  plans: { ...d.plans, [addDays(date, 1)]: plan(addDays(date, 1)) },
});

const run = (d: AppData, ...ms: Mutation[]) => ms.reduce((acc, m) => applyMutation(acc, m, TODAY), d);

describe('daily requirements', () => {
  it('needs all three categories', () => {
    let d = base();
    d = run(d, { type: 'upsertFood', log: food(TODAY) });
    expect(dayChecks(d, TODAY)).toMatchObject({ food: false, done: 0 }); // logged but not finalised
    d = run(d, { type: 'finishFoodLog', date: TODAY, at: NOW });
    expect(dayChecks(d, TODAY)).toMatchObject({ food: true, activity: false, planning: false, done: 1, complete: false });
    d = run(d, { type: 'upsertActivity', log: workout(TODAY) });
    expect(dayChecks(d, TODAY)).toMatchObject({ done: 2, complete: false });
    d = run(d, { type: 'savePlan', plan: plan(addDays(TODAY, 1)) });
    expect(dayChecks(d, TODAY)).toMatchObject({ done: 3, complete: true });
  });

  it('counts activity alone or planning alone as partial only', () => {
    const a = run(base(), { type: 'saveRestDay', date: TODAY, at: NOW });
    expect(dayChecks(a, TODAY)).toMatchObject({ activity: true, done: 1, complete: false });
    const p = run(base(), { type: 'savePlan', plan: plan(addDays(TODAY, 1)) });
    expect(dayChecks(p, TODAY)).toMatchObject({ planning: true, done: 1 });
  });

  it('accepts Rest Day as a complete activity, idempotently, and switching from a planned workout', () => {
    let d = run(base(), { type: 'savePlan', plan: plan(TODAY) });
    d = run(d, { type: 'saveRestDay', date: TODAY, at: NOW }, { type: 'saveRestDay', date: TODAY, at: NOW });
    expect(Object.keys(d.recoveryLogs)).toEqual([TODAY]);
    expect(dayChecks(d, TODAY).activity).toBe(true);
  });

  it('planning requires saved meals (or flexible) and an activity (or rest)', () => {
    expect(isPlanComplete(plan(TODAY))).toBe(true);
    expect(isPlanComplete(plan(TODAY, { savedAt: undefined }))).toBe(false);
    expect(isPlanComplete(plan(TODAY, { meals: [] }))).toBe(false);
    expect(isPlanComplete(plan(TODAY, { meals: [], flexibleMeals: true }))).toBe(true);
    expect(isPlanComplete(plan(TODAY, { activity: null }))).toBe(false);
    expect(isPlanComplete(plan(TODAY, { activity: { type: 'rest' } }))).toBe(true);
    expect(isPlanComplete(plan(TODAY, { activity: { type: 'gym', time: '21:30' } }))).toBe(false);
  });

  it('refuses to finalise an empty food log, and reopens when meals are removed', () => {
    expect(() => run(base(), { type: 'finishFoodLog', date: TODAY, at: NOW })).toThrow(MutationRejected);
    const log = food(TODAY, 'only');
    let d = run(base(), { type: 'upsertFood', log }, { type: 'finishFoodLog', date: TODAY, at: NOW });
    d = run(d, { type: 'upsertFood', log: food(TODAY) }); // adding after finalising is allowed
    expect(d.foodLogs).toHaveLength(2);
    d = run(d, { type: 'deleteFood', id: 'only' });
    expect(dayChecks(d, TODAY).food).toBe(true);
    d = run(d, { type: 'deleteFood', id: d.foodLogs[0].id });
    expect(dayChecks(d, TODAY).food).toBe(false);
  });

  it('never depends on eating-window adherence', () => {
    let d = { ...base(), eatingWindow: { enabled: true, start: '08:00', end: '18:00', reminders: false } };
    d = run(d, { type: 'upsertFood', log: { ...food(TODAY), time: '23:30', outsideWindow: true } }, { type: 'finishFoodLog', date: TODAY, at: NOW });
    expect(dayChecks(d, TODAY).food).toBe(true);
  });
});

describe('validation', () => {
  const ok = { type: 'gym' as const, date: TODAY, startTime: '21:30', durationMin: 45, description: 'Strength training' };
  it('accepts a valid manual workout', () => expect(validateWorkout(ok).ok).toBe(true));
  it.each([
    ['type', { type: undefined }, 'validation.activityType'],
    ['durationMin', { durationMin: undefined }, 'validation.duration'],
    ['durationMin', { durationMin: 0 }, 'validation.duration'],
    ['startTime', { startTime: '' }, 'validation.startTime'],
    ['startTime', { startTime: '25:00' }, 'validation.startTime'],
    ['description', { description: ' ' }, 'validation.description'],
  ])('rejects missing %s', (field, patch, message) => {
    const r = validateWorkout({ ...ok, ...patch });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[field as keyof typeof r.errors]).toBe(message);
  });

  it('prevents duplicate workouts and keeps re-saves idempotent', () => {
    const w = workout(TODAY, { id: 'w1' });
    let d = run(base(), { type: 'upsertActivity', log: w }, { type: 'upsertActivity', log: w });
    expect(d.activityLogs).toHaveLength(1);
    expect(() => run(d, { type: 'upsertActivity', log: { ...w, id: 'w2' } })).toThrow(MutationRejected);
    d = run(d, { type: 'upsertActivity', log: workout(TODAY, { id: 'w3', type: 'outdoor_walk', startTime: '18:00' }) });
    expect(d.activityLogs).toHaveLength(2);
    expect(streakStats(d, TODAY).completedDays).toBe(0);
  });
});

describe('grace window and history protection', () => {
  it('allows today and yesterday, locks older days and the future', () => {
    expect(canEditCheckIns(TODAY, TODAY)).toBe(true);
    expect(canEditCheckIns(addDays(TODAY, -1), TODAY)).toBe(true);
    expect(canEditCheckIns(addDays(TODAY, -2), TODAY)).toBe(false);
    expect(canEditCheckIns(addDays(TODAY, 1), TODAY)).toBe(false);
    expect(() => run(base(), { type: 'upsertFood', log: food(addDays(TODAY, -2)) })).toThrow(MutationRejected);
    expect(() => run(base(), { type: 'saveRestDay', date: addDays(TODAY, -3), at: NOW })).toThrow(MutationRejected);
  });

  it('supports late entries for yesterday that complete yesterday', () => {
    const y = addDays(TODAY, -1);
    let d = run(base(), { type: 'savePlan', plan: plan(TODAY) });
    d = run(d, { type: 'upsertFood', log: food(y) }, { type: 'finishFoodLog', date: y, at: NOW }, { type: 'upsertActivity', log: workout(y) });
    expect(dayChecks(d, y).complete).toBe(true);
    expect(streakStats(d, TODAY).current).toBe(1);
  });

  it('refuses to edit plans for past dates', () => {
    expect(() => run(base(), { type: 'savePlan', plan: plan(addDays(TODAY, -1)) })).toThrow(MutationRejected);
  });
});

describe('streaks and calendar', () => {
  it('counts consecutive complete days, keeps history after a miss', () => {
    let d = base();
    for (const offset of [-6, -5, -4, -2, -1]) d = completeDay(d, addDays(TODAY, offset));
    const s = streakStats(d, TODAY);
    expect(s).toEqual({ current: 2, longest: 3, completedDays: 5 });
    expect(calendarStatus(d, addDays(TODAY, -3), TODAY, '2026-10-01')).toBe('incomplete');
    expect(calendarStatus(d, addDays(TODAY, -4), TODAY, '2026-10-01')).toBe('complete');
    expect(calendarStatus(d, TODAY, TODAY, '2026-10-01')).toBe('today');
    expect(calendarStatus(d, addDays(TODAY, 2), TODAY, '2026-10-01')).toBe('future');
  });

  it('does not break the streak while today is still open, and includes today once complete', () => {
    let d = completeDay(base(), addDays(TODAY, -1));
    expect(streakStats(d, TODAY).current).toBe(1);
    d = completeDay(d, TODAY);
    expect(streakStats(d, TODAY).current).toBe(2);
  });

  it('shows partial days', () => {
    const d = run(base(), { type: 'saveRestDay', date: addDays(TODAY, -1), at: NOW });
    expect(calendarStatus(d, addDays(TODAY, -1), TODAY, '2026-10-01')).toBe('partial');
  });

  it('is unaffected by DST and month/year boundaries (local dates)', () => {
    // 2026-03-29 and 2026-10-25 are DST changes in Europe; 2026-12-31 → 2027-01-01 crosses a year.
    for (const [a, b] of [['2026-03-28', '2026-03-29'], ['2026-10-24', '2026-10-25'], ['2026-12-31', '2027-01-01']]) {
      expect(addDays(a, 1)).toBe(b);
      expect(daysBetween(a, b)).toBe(1);
      let d = completeDay(completeDay(base(), a), b);
      d = { ...d, profile };
      expect(streakStats(d, b).current).toBe(2);
    }
  });

  it('reports journey statistics from real records', () => {
    let d = completeDay(base(), addDays(TODAY, -1));
    d = run(d, { type: 'saveRestDay', date: TODAY, at: NOW });
    const s = journeyStats(d, TODAY);
    expect(s).toMatchObject({ workouts: 1, recoveryDays: 1, mealsLogged: 1, completedDays: 1 });
  });
});

describe('eating window', () => {
  it('handles normal and overnight windows', () => {
    expect(isWithinWindow('12:00', '06:00', '18:00')).toBe(true);
    expect(isWithinWindow('19:00', '06:00', '18:00')).toBe(false);
    expect(isWithinWindow('23:00', '20:00', '06:00')).toBe(true);
    expect(isWithinWindow('12:00', '20:00', '06:00')).toBe(false);
  });
});

describe('reminders', () => {
  const withNotif = (mode: AppData['notifications']['mode']): AppData => ({
    ...base(),
    notifications: { ...base().notifications, enabled: true, mode },
  });

  it('sends nothing unless enabled, and respects pause', () => {
    expect(planReminders(base(), TODAY, '07:00')).toEqual([]);
    expect(planReminders({ ...withNotif('smart'), notifications: { ...withNotif('smart').notifications, paused: true } }, TODAY, '07:00')).toEqual([]);
  });

  it('light mode = one planning reminder per day, dropped once planned', () => {
    const d = withNotif('light');
    expect(planReminders(d, TODAY, '07:00').map((r) => r.kind)).toEqual(['planning', 'planning']);
    const planned = run(d, { type: 'savePlan', plan: plan(addDays(TODAY, 1)) });
    expect(planReminders(planned, TODAY, '07:00').filter((r) => r.date === TODAY)).toEqual([]);
  });

  it('smart mode reminds about the planned activity until it is logged, and skips past times', () => {
    let d = run(withNotif('smart'), { type: 'savePlan', plan: plan(TODAY) });
    const kinds = planReminders(d, TODAY, '07:00').filter((r) => r.date === TODAY).map((r) => r.kind);
    expect(kinds).toEqual(['morning', 'planning', 'activity']);
    expect(planReminders(d, TODAY, '09:00').filter((r) => r.date === TODAY).map((r) => r.kind)).toEqual(['planning', 'activity']);
    d = run(d, { type: 'saveRestDay', date: TODAY, at: NOW });
    expect(planReminders(d, TODAY, '07:00').some((r) => r.date === TODAY && r.kind === 'activity')).toBe(false);
  });

  it('hourly mode stays inside the range and outside quiet hours', () => {
    const d = { ...withNotif('hourly'), notifications: { ...withNotif('hourly').notifications, hourlyStart: '09:00', hourlyEnd: '23:00', quietStart: '22:00', quietEnd: '07:00' } };
    const hourly = planReminders(d, TODAY, '00:00').filter((r) => r.kind === 'hourly' && r.date === TODAY).map((r) => r.time);
    expect(hourly[0]).toBe('09:00');
    expect(hourly).not.toContain('22:00');
    expect(hourly).not.toContain('23:00');
  });
});

describe('food search', () => {
  it('matches several words in any order', () => {
    const { searchFoods } = jest.requireActual('./nutrition') as typeof import('./nutrition');
    expect(searchFoods('rice white').foods[0].id).toBe('rice_white');
    expect(searchFoods('white rice').foods[0].id).toBe('rice_white');
    expect(searchFoods('oat').foods.map((f) => f.id)).toEqual(expect.arrayContaining(['oats', 'oatmeal']));
    expect(searchFoods('zzzz').foods).toHaveLength(0);
  });
});
