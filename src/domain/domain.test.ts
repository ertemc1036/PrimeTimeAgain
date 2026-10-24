import { ACTIONS, CUSTOM_ACTIONS, GOAL_TEMPLATES, getActionTemplate } from './catalog';
import { addDays, monthGrid, startOfWeek, weekdayIndex } from './dates';
import { canScheduleRecovery, dayType, streakInfo } from './days';
import { generateMissions, maxMissionsFor, missionFromAction, replacementFor } from './missions';
import { applyMutation } from './mutations';
import { buildPlan, goalFromTemplate } from './plan';
import { currentPhase, milestones, phases, programDay, weekTheme } from './program';
import { areaProgress, goalProgress, weeklyTallies } from './progress';
import type { AppData, DayRecord, Mission, Program } from './types';

const TODAY = '2026-10-24'; // a Saturday
const program = (over: Partial<Program> = {}): Program => ({ startDate: '2026-10-01', durationDays: 90, dailyMinutes: 30, ...over });
const NOW = '2026-10-24T10:00:00.000Z';

describe('catalog', () => {
  it('references only existing actions and has unique ids', () => {
    const ids = [...ACTIONS, ...CUSTOM_ACTIONS].map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const g of GOAL_TEMPLATES) for (const a of g.actions) expect([g.id, getActionTemplate(a)?.id]).toEqual([g.id, a]);
    expect(GOAL_TEMPLATES).toHaveLength(19);
  });
});

describe('dates', () => {
  it('uses Monday-based weeks', () => {
    expect(weekdayIndex('2026-10-26')).toBe(0); // Monday
    expect(startOfWeek(TODAY)).toBe('2026-10-19');
  });
  it('builds month grids', () => {
    const grid = monthGrid('2026-10'); // Oct 1, 2026 is a Thursday
    expect(grid[0].slice(0, 4)).toEqual([null, null, null, '2026-10-01']);
    expect(grid.flat().filter(Boolean)).toHaveLength(31);
    expect(grid.every((w) => w.length === 7)).toBe(true);
  });
});

describe('program', () => {
  it('splits 90 days into Reset / Rebuild / Prime', () => {
    expect(phases(90).map((p) => [p.startDay, p.endDay])).toEqual([[1, 30], [31, 60], [61, 90]]);
    expect(phases(30).map((p) => p.endDay)).toEqual([10, 20, 30]);
  });
  it('tracks the current day and phase', () => {
    expect(programDay(program(), TODAY)).toBe(24);
    expect(currentPhase(program(), TODAY).id).toBe('reset');
    expect(currentPhase(program(), addDays(TODAY, 20)).id).toBe('rebuild');
    expect(currentPhase(program(), addDays(TODAY, 40)).id).toBe('prime');
  });
  it('creates milestones and weekly themes for any duration', () => {
    expect(milestones(90).map((m) => m.day)).toEqual([1, 7, 30, 60, 90]);
    expect(milestones(14).map((m) => m.day)).toEqual([1, 5, 7, 9, 14]);
    expect(weekTheme(1, 90)).toBe(1);
    expect(weekTheme(13, 90)).toBe(13);
    expect(weekTheme(26, 180)).toBe(13);
  });
});

describe('generateMissions', () => {
  const goals = ['lose_weight', 'confidence', 'make_money', 'lifestyle'].map((id) => goalFromTemplate(id as never, NOW));

  it('respects the daily time budget', () => {
    for (const minutes of [15, 30, 45, 60, 90]) {
      for (let d = 0; d < 20; d++) {
        const date = addDays('2026-10-01', d);
        const ms = generateMissions(goals, program({ dailyMinutes: minutes }), date, {});
        expect(ms.length).toBeGreaterThan(0);
        expect(ms.length).toBeLessThanOrEqual(maxMissionsFor(minutes));
        expect(ms.reduce((s, m) => s + m.minutes, 0)).toBeLessThanOrEqual(minutes);
      }
    }
  });

  it('is deterministic, spreads goals over the week and avoids duplicates', () => {
    const a = generateMissions(goals, program(), TODAY, {});
    expect(generateMissions(goals, program(), TODAY, {})).toEqual(a);
    expect(new Set(a.map((m) => m.actionTemplateId)).size).toBe(a.length);
    const week = Array.from({ length: 7 }, (_, i) => generateMissions(goals, program(), addDays(TODAY, i), {})).flat();
    expect(new Set(week.map((m) => m.goalId)).size).toBe(goals.length);
  });

  it('keeps the first two weeks gentle', () => {
    const early = Array.from({ length: 14 }, (_, i) => generateMissions(goals, program({ dailyMinutes: 90 }), addDays('2026-10-01', i), {})).flat();
    expect(early.every((m) => m.difficulty <= 2)).toBe(true);
  });

  it('counts carried-over missions against the budget', () => {
    const carried = [{ ...missionFromAction(TODAY, goals[0], goals[0].actions[0]), minutes: 25 }];
    const ms = generateMissions(goals, program({ dailyMinutes: 30 }), TODAY, {}, carried);
    expect(ms.reduce((s, m) => s + m.minutes, 0)).toBeLessThanOrEqual(5);
  });

  it('returns nothing without active goals, and one short mission when nothing fits', () => {
    expect(generateMissions([], program(), TODAY, {})).toEqual([]);
    const ms = generateMissions(goals, program({ dailyMinutes: 1 }), TODAY, {});
    expect(ms).toHaveLength(1);
  });
});

const mission = (status: Mission['status'], goalId = 'g_lose_weight'): Mission => ({
  id: `${status}-${Math.random()}`,
  goalId,
  actionId: 'walk_20',
  actionTemplateId: 'walk_20',
  minutes: 20,
  difficulty: 1,
  status,
});
const day = (date: string, statuses: Mission['status'][], recovery = false): DayRecord => ({
  date,
  missions: statuses.map((s) => mission(s)),
  generated: true,
  recovery,
});

describe('day types and streaks', () => {
  const p = program({ startDate: '2026-10-18' });
  it('classifies days', () => {
    expect(dayType(p, day('2026-10-20', ['done', 'done']), '2026-10-20', TODAY)).toBe('prime');
    expect(dayType(p, day('2026-10-20', ['done', 'open']), '2026-10-20', TODAY)).toBe('active');
    expect(dayType(p, day('2026-10-20', ['done', 'skipped']), '2026-10-20', TODAY)).toBe('active');
    expect(dayType(p, day('2026-10-20', ['done', 'postponed']), '2026-10-20', TODAY)).toBe('prime');
    expect(dayType(p, day('2026-10-20', ['open'], true), '2026-10-20', TODAY)).toBe('recovery');
    expect(dayType(p, undefined, '2026-10-20', TODAY)).toBe('missed');
    expect(dayType(p, day(TODAY, ['open']), TODAY, TODAY)).toBe('open');
    expect(dayType(p, undefined, '2026-10-30', TODAY)).toBe('upcoming');
    expect(dayType(p, undefined, '2026-10-10', TODAY)).toBe('none');
  });

  it('counts showing-up days and keeps the longest streak after a miss', () => {
    const days = {
      '2026-10-18': day('2026-10-18', ['done']),
      '2026-10-19': day('2026-10-19', ['done', 'open']),
      '2026-10-20': day('2026-10-20', [], true),
      // 21 missed
      '2026-10-22': day('2026-10-22', ['done']),
      '2026-10-23': day('2026-10-23', ['done']),
      [TODAY]: day(TODAY, ['open']),
    };
    const s = streakInfo(p, days, TODAY);
    expect(s).toMatchObject({ current: 2, longest: 3, primeDays: 3, activeDays: 1, recoveryDays: 1, missedDays: 1 });
    const done = { ...days, [TODAY]: day(TODAY, ['done']) };
    expect(streakInfo(p, done, TODAY).current).toBe(3);
  });

  it('limits recovery days and protects the past', () => {
    const days = { '2026-10-26': day('2026-10-26', [], true), '2026-10-27': day('2026-10-27', [], true) };
    expect(canScheduleRecovery(p, days, '2026-10-28', TODAY)).toEqual({ ok: false, reason: 'limit' });
    expect(canScheduleRecovery(p, days, '2026-10-26', TODAY).ok).toBe(true);
    expect(canScheduleRecovery(p, {}, '2026-10-20', TODAY)).toEqual({ ok: false, reason: 'past' });
    expect(canScheduleRecovery(p, {}, '2027-06-01', TODAY)).toEqual({ ok: false, reason: 'outside' });
  });
});

describe('mutations', () => {
  const base = (): AppData =>
    buildPlan(
      { goalIds: ['get_fit'], customGoals: [{ id: 'c1', title: ' Learn guitar ', area: 'lifestyle' }], profile: { name: ' Sam ', startingPoint: {} }, durationDays: 90, dailyMinutes: 30, avatar: null },
      TODAY,
      NOW,
    );

  it('builds a plan with template and custom goals', () => {
    const d = base();
    expect(d.profile?.name).toBe('Sam');
    expect(d.goals.map((g) => g.title ?? g.templateId)).toEqual(['get_fit', 'Learn guitar']);
    expect(d.goals[1].actions.map((a) => a.templateId)).toEqual(['custom_work', 'custom_plan', 'custom_review']);
  });

  it('ensures a day once and completes missions today only', () => {
    let d = base();
    const ms = generateMissions(d.goals, d.program!, TODAY, {});
    d = applyMutation(d, { type: 'ensureDay', date: TODAY, missions: ms }, TODAY);
    d = applyMutation(d, { type: 'ensureDay', date: TODAY, missions: ms }, TODAY);
    expect(d.days[TODAY].missions).toHaveLength(ms.length);
    d = applyMutation(d, { type: 'setMissionStatus', date: TODAY, missionId: ms[0].id, status: 'done', at: NOW }, TODAY);
    expect(d.days[TODAY].missions[0]).toMatchObject({ status: 'done', completedAt: NOW });
    const later = applyMutation(d, { type: 'setMissionStatus', date: TODAY, missionId: ms[0].id, status: 'open' }, addDays(TODAY, 1));
    expect(later).toBe(d); // yesterday is read-only
  });

  it('postpones to tomorrow and merges with tomorrow\'s generated missions', () => {
    let d = base();
    const ms = generateMissions(d.goals, d.program!, TODAY, {});
    d = applyMutation(d, { type: 'ensureDay', date: TODAY, missions: ms }, TODAY);
    const tomorrow = addDays(TODAY, 1);
    d = applyMutation(d, { type: 'postponeMission', date: TODAY, missionId: ms[0].id, toDate: tomorrow }, TODAY);
    expect(d.days[TODAY].missions[0].status).toBe('postponed');
    expect(d.days[tomorrow]).toMatchObject({ generated: false, missions: [{ carriedFrom: TODAY, status: 'open' }] });
    const fresh = generateMissions(d.goals, d.program!, tomorrow, {}, d.days[tomorrow].missions);
    d = applyMutation(d, { type: 'ensureDay', date: tomorrow, missions: fresh }, tomorrow);
    expect(d.days[tomorrow].missions.length).toBe(1 + fresh.length);
    expect(d.days[tomorrow].missions.reduce((s, m) => s + m.minutes, 0)).toBeLessThanOrEqual(30 + 0);
  });

  it('finds a replacement from the same goal', () => {
    const d = base();
    const goal = d.goals[0];
    const dayRec = { date: TODAY, generated: true, recovery: false, missions: [missionFromAction(TODAY, goal, goal.actions[0])] };
    const r = replacementFor(dayRec.missions[0], goal, dayRec);
    expect(r && r.id).not.toBe(goal.actions[0].id);
  });

  it('refuses recovery in the past', () => {
    const d = base();
    expect(applyMutation(d, { type: 'setRecovery', date: '2026-10-01', recovery: true }, TODAY)).toBe(d);
  });
});

describe('progress', () => {
  it('measures follow-through and ignores today\'s open missions', () => {
    const p = program({ startDate: '2026-10-20' });
    const days = {
      '2026-10-22': day('2026-10-22', ['done', 'open']),
      '2026-10-23': day('2026-10-23', ['done', 'skipped']),
      [TODAY]: day(TODAY, ['done', 'open']),
    };
    const goal = goalFromTemplate('lose_weight', NOW);
    expect(goalProgress(goal, p, days, TODAY)).toEqual({ done: 3, planned: 5, percent: 60 });
    expect(areaProgress('body', [goal], p, days, TODAY).percent).toBe(60);
    expect(areaProgress('money', [goal], p, days, TODAY).percent).toBeNull();
    expect(weeklyTallies(p, days, TODAY)[0].tally.done).toBe(3);
  });
});
