import { unlockedAchievements } from './achievements';
import { coachTips, coachToday } from './coach';
import { addDays } from './dates';
import { buildPlan } from './plan';
import type { AppData, Mission } from './types';

const TODAY = '2026-10-24';
const plan = (): AppData => ({
  ...buildPlan({ goalIds: ['get_fit', 'make_money'], customGoals: [], profile: { name: 'A', startingPoint: {} }, durationDays: 90, dailyMinutes: 30, avatar: null }, '2026-10-01', 'now'),
});
const m = (status: Mission['status'], goalId = 'g_get_fit', minutes = 10): Mission => ({
  id: Math.random().toString(),
  goalId,
  actionId: 'x',
  minutes,
  difficulty: 1,
  status,
});

describe('coach preview', () => {
  it('reacts to today', () => {
    const d = plan();
    expect(coachToday({ ...d, days: { [TODAY]: { date: TODAY, missions: [m('done')], generated: true, recovery: false } } }, TODAY).key).toBe('allDone');
    expect(coachToday({ ...d, days: { [TODAY]: { date: TODAY, missions: [m('done'), m('open')], generated: true, recovery: false } } }, TODAY).key).toBe('someDone');
    expect(coachToday({ ...d, days: { [TODAY]: { date: TODAY, missions: [], generated: true, recovery: true } } }, TODAY).key).toBe('recovery');
    const msg = coachToday({ ...d, days: { [TODAY]: { date: TODAY, missions: [m('open', 'g_get_fit', 20), m('open', 'g_get_fit', 5)], generated: true, recovery: false } } }, TODAY);
    expect(msg).toEqual({ key: 'afterMiss' });
  });

  it('suggests a lighter plan when follow-through is low, and names the weakest area', () => {
    const d = plan();
    const days: AppData['days'] = {};
    for (let i = 1; i <= 6; i++) {
      const date = addDays(TODAY, -i);
      days[date] = { date, generated: true, recovery: false, missions: [m(i % 3 === 0 ? 'done' : 'open', 'g_get_fit'), m('open', 'g_make_money')] };
    }
    const tips = coachTips({ ...d, days }, TODAY).map((x) => x.key);
    expect(tips).toEqual(['phase', 'tooMuch', 'lowArea']);
    expect(coachTips({ ...d, days }, TODAY)[2]).toMatchObject({ area: 'money', percent: 0 });
  });
});

describe('achievements', () => {
  it('unlocks from effort and consistency', () => {
    const d = plan();
    const days: AppData['days'] = {};
    for (let i = 0; i < 8; i++) {
      const date = addDays(TODAY, -i);
      days[date] = { date, generated: true, recovery: false, missions: [m('done', 'g_get_fit', 80)] }; // 8 × 80 min > 10 h
    }
    const got = unlockedAchievements({ ...d, days }, TODAY);
    expect([...got].sort()).toEqual(['first_mission', 'first_prime', 'hours_10', 'streak_7']);
  });
});
