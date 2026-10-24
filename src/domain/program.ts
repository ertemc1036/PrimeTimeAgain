import { addDays, daysBetween } from './dates';
import type { ISODate, Program } from './types';

export const DURATION_OPTIONS = [30, 60, 90, 180] as const;
export const DEFAULT_DURATION = 90;
export const MIN_DURATION = 14;
export const MAX_DURATION = 365;
export const MINUTE_OPTIONS = [15, 30, 45, 60, 90] as const;
export const MIN_DAILY_MINUTES = 5;
export const MAX_DAILY_MINUTES = 240;

export type PhaseId = 'reset' | 'rebuild' | 'prime';
export type StageStatus = 'done' | 'current' | 'upcoming';

export interface Phase {
  id: PhaseId;
  startDay: number;
  endDay: number;
}

/** Number of weekly themes available in i18n (`journey.weeks.w1` … `w13`). */
export const WEEK_THEME_COUNT = 13;

export const clampDuration = (days: number) => Math.min(Math.max(Math.round(days), MIN_DURATION), MAX_DURATION);
export const clampMinutes = (m: number) => Math.min(Math.max(Math.round(m), MIN_DAILY_MINUTES), MAX_DAILY_MINUTES);

/** Three phases of (roughly) equal length: Reset, Rebuild, Prime. For 90 days: 1–30, 31–60, 61–90. */
export function phases(durationDays: number): Phase[] {
  const a = Math.round(durationDays / 3);
  const b = Math.round((durationDays * 2) / 3);
  return [
    { id: 'reset', startDay: 1, endDay: a },
    { id: 'rebuild', startDay: a + 1, endDay: b },
    { id: 'prime', startDay: b + 1, endDay: durationDays },
  ];
}

/** 1-based day of the program for a date (may be > duration once finished, < 1 before the start). */
export const programDayRaw = (program: Program, date: ISODate) => daysBetween(program.startDate, date) + 1;

/** 1-based program day clamped to the program length. */
export const programDay = (program: Program, date: ISODate) =>
  Math.min(Math.max(programDayRaw(program, date), 1), program.durationDays);

export const programEndDate = (program: Program): ISODate => addDays(program.startDate, program.durationDays - 1);

export const isInProgram = (program: Program, date: ISODate) => {
  const d = programDayRaw(program, date);
  return d >= 1 && d <= program.durationDays;
};

export const isProgramComplete = (program: Program, today: ISODate) => programDayRaw(program, today) > program.durationDays;

export const currentPhase = (program: Program, date: ISODate): Phase => {
  const day = programDay(program, date);
  return phases(program.durationDays).find((p) => day >= p.startDay && day <= p.endDay)!;
};

export const stageStatus = (start: number, end: number, day: number): StageStatus =>
  day > end ? 'done' : day >= start ? 'current' : 'upcoming';

export const weekCount = (durationDays: number) => Math.ceil(durationDays / 7);

/** Spread the 13 weekly themes across any program length. */
export const weekTheme = (week: number, durationDays: number): number => {
  const weeks = weekCount(durationDays);
  return Math.min(Math.floor(((week - 1) * WEEK_THEME_COUNT) / weeks) + 1, WEEK_THEME_COUNT);
};

export interface Milestone {
  day: number;
  kind: 'start' | 'first_week' | 'phase' | 'finish';
  phase?: PhaseId;
}

export function milestones(durationDays: number): Milestone[] {
  const p = phases(durationDays);
  const list: Milestone[] = [
    { day: 1, kind: 'start' },
    { day: 7, kind: 'first_week' },
    { day: p[0].endDay, kind: 'phase', phase: 'reset' },
    { day: p[1].endDay, kind: 'phase', phase: 'rebuild' },
    { day: durationDays, kind: 'finish' },
  ];
  const seen = new Set<number>();
  return list
    .filter((m) => m.day >= 1 && m.day <= durationDays && !seen.has(m.day) && seen.add(m.day))
    .sort((a, b) => a.day - b.day);
}
