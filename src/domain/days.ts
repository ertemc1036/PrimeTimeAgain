import { addDays, daysBetween, startOfWeek } from './dates';
import { isInProgram, programEndDate } from './program';
import type { DayRecord, ISODate, Program } from './types';

/**
 * Day types (used everywhere: Missions, Calendar, Journey, streaks).
 * - prime:    every planned core mission is done (at least one).
 * - active:   at least one mission done, but not all.
 * - recovery: a planned recovery day. Counts as following the program.
 * - open:     today, nothing done yet (not counted against you).
 * - missed:   a past program day with nothing done.
 * - upcoming: a future program day.
 * - none:     outside the program.
 * Postponed missions don't count for the day they were moved from. Skipped missions do count as planned.
 */
export type DayType = 'prime' | 'active' | 'recovery' | 'open' | 'missed' | 'upcoming' | 'none';

export const SHOWED_UP: readonly DayType[] = ['prime', 'active', 'recovery'];
export const MAX_RECOVERY_PER_WEEK = 2;

export function dayType(program: Program | null, day: DayRecord | undefined, date: ISODate, today: ISODate): DayType {
  if (!program || !isInProgram(program, date)) return 'none';
  if (day?.recovery) return 'recovery';
  const planned = (day?.missions ?? []).filter((m) => m.status !== 'postponed');
  const done = planned.filter((m) => m.status === 'done').length;
  if (done > 0 && done === planned.length) return 'prime';
  if (done > 0) return 'active';
  if (date === today) return 'open';
  return daysBetween(today, date) > 0 ? 'upcoming' : 'missed';
}

export interface StreakInfo {
  current: number;
  longest: number;
  primeDays: number;
  activeDays: number;
  recoveryDays: number;
  missedDays: number;
}

/**
 * Prime Streak: consecutive days you showed up (Prime, Active or Recovery).
 * Today only extends the streak once you've done something; an open today never breaks it.
 * A missed day resets the current streak but never erases totals or your longest streak.
 */
export function streakInfo(program: Program | null, days: Record<ISODate, DayRecord>, today: ISODate): StreakInfo {
  const info: StreakInfo = { current: 0, longest: 0, primeDays: 0, activeDays: 0, recoveryDays: 0, missedDays: 0 };
  if (!program) return info;
  const end = daysBetween(programEndDate(program), today) > 0 ? programEndDate(program) : today;
  let run = 0;
  for (let d = program.startDate; daysBetween(d, end) >= 0; d = addDays(d, 1)) {
    const type = dayType(program, days[d], d, today);
    if (type === 'prime') info.primeDays++;
    if (type === 'active') info.activeDays++;
    if (type === 'recovery') info.recoveryDays++;
    if (type === 'missed') info.missedDays++;
    if (SHOWED_UP.includes(type)) run++;
    else if (type !== 'open') run = 0;
    info.longest = Math.max(info.longest, run);
  }
  info.current = run;
  return info;
}

/** History is read-only: only today's missions can be changed. */
export const canEditMissions = (date: ISODate, today: ISODate) => date === today;

/** Recovery days can be planned for today or the future, up to two per (Monday-based) week. */
export function canScheduleRecovery(
  program: Program | null,
  days: Record<ISODate, DayRecord>,
  date: ISODate,
  today: ISODate,
): { ok: boolean; reason?: 'past' | 'outside' | 'limit' } {
  if (!program || !isInProgram(program, date)) return { ok: false, reason: 'outside' };
  if (daysBetween(today, date) < 0) return { ok: false, reason: 'past' };
  if (days[date]?.recovery) return { ok: true };
  const monday = startOfWeek(date);
  const count = Array.from({ length: 7 }, (_, i) => addDays(monday, i)).filter((d) => days[d]?.recovery).length;
  return count >= MAX_RECOVERY_PER_WEEK ? { ok: false, reason: 'limit' } : { ok: true };
}
