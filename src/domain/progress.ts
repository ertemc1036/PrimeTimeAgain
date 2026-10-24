import { addDays, daysBetween, lastNDays } from './dates';
import { programDay, weekCount } from './program';
import type { AreaId, DayRecord, ISODate, Mission, Program, UserGoal } from './types';

/**
 * Goal progress = follow-through on the missions planned for that goal over a rolling window.
 * It measures your own actions, not outcomes like weight or income.
 * Today's still-open missions are not counted against you.
 */
export interface Tally {
  done: number;
  planned: number;
  /** 0–100, or null when nothing has been planned yet. */
  percent: number | null;
}

const tally = (done: number, planned: number): Tally => ({
  done,
  planned,
  percent: planned ? Math.round((done / planned) * 100) : null,
});

function countMissions(
  days: Record<ISODate, DayRecord>,
  dates: ISODate[],
  today: ISODate,
  include: (m: Mission) => boolean,
): Tally {
  let done = 0;
  let planned = 0;
  for (const date of dates) {
    const day = days[date];
    if (!day || day.recovery) continue;
    for (const m of day.missions) {
      if (!include(m) || m.status === 'postponed') continue;
      if (m.status === 'done') {
        done++;
        planned++;
      } else if (date !== today) planned++;
    }
  }
  return tally(done, planned);
}

const windowDates = (program: Program, today: ISODate, windowDays: number) =>
  lastNDays(today, windowDays).filter((d) => daysBetween(program.startDate, d) >= 0);

export const goalProgress = (goal: UserGoal, program: Program, days: Record<ISODate, DayRecord>, today: ISODate, windowDays = 14) =>
  countMissions(days, windowDates(program, today, windowDays), today, (m) => m.goalId === goal.id);

export function areaProgress(
  area: AreaId,
  goals: UserGoal[],
  program: Program,
  days: Record<ISODate, DayRecord>,
  today: ISODate,
  windowDays = 14,
): Tally {
  const ids = new Set(goals.filter((g) => g.area === area && !g.archived).map((g) => g.id));
  return countMissions(days, windowDates(program, today, windowDays), today, (m) => ids.has(m.goalId));
}

export const overallProgress = (program: Program, days: Record<ISODate, DayRecord>, today: ISODate, windowDays = 14) =>
  countMissions(days, windowDates(program, today, windowDays), today, () => true);

/** Areas the user has active goals in, in a stable order. */
export const activeAreas = (goals: UserGoal[]): AreaId[] => {
  const order: AreaId[] = ['body', 'mind', 'money', 'social', 'lifestyle', 'presence'];
  const used = new Set(goals.filter((g) => !g.archived).map((g) => g.area));
  return order.filter((a) => used.has(a));
};

/** Per program week: done vs planned for one goal (or all goals). */
export function weeklyTallies(
  program: Program,
  days: Record<ISODate, DayRecord>,
  today: ISODate,
  goalId?: string,
): { week: number; tally: Tally; current: boolean }[] {
  const currentWeek = Math.ceil(programDay(program, today) / 7);
  return Array.from({ length: weekCount(program.durationDays) }, (_, i) => {
    const week = i + 1;
    const dates = Array.from({ length: 7 }, (_, d) => addDays(program.startDate, i * 7 + d)).filter(
      (d) => daysBetween(d, today) >= 0 && programDay(program, d) <= program.durationDays,
    );
    return {
      week,
      current: week === currentWeek,
      tally: countMissions(days, dates, today, (m) => !goalId || m.goalId === goalId),
    };
  }).filter((w) => w.week <= currentWeek);
}

export interface Totals {
  missionsDone: number;
  minutesInvested: number;
}

export function totals(days: Record<ISODate, DayRecord>, goalId?: string): Totals {
  let missionsDone = 0;
  let minutesInvested = 0;
  for (const day of Object.values(days)) {
    for (const m of day.missions) {
      if (m.status !== 'done' || (goalId && m.goalId !== goalId)) continue;
      missionsDone++;
      minutesInvested += m.minutes;
    }
  }
  return { missionsDone, minutesInvested };
}

/** Recent completed missions for a goal, newest first. */
export function goalHistory(days: Record<ISODate, DayRecord>, goalId: string, limit = 20) {
  return Object.values(days)
    .flatMap((d) => d.missions.filter((m) => m.goalId === goalId && m.status === 'done').map((m) => ({ date: d.date, mission: m })))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, limit);
}
