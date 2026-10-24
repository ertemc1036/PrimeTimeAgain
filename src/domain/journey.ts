import { daysBetween } from './dates';
import type { CompletionLog, ISODate } from './types';

export const JOURNEY_LENGTH = 90;
export const MILESTONE_DAYS = [7, 30, 60, 90] as const;

export type PhaseId = 'reset' | 'rebuild' | 'rise';

export interface Phase {
  id: PhaseId;
  startDay: number;
  endDay: number;
}

export const PHASES: readonly Phase[] = [
  { id: 'reset', startDay: 1, endDay: 30 },
  { id: 'rebuild', startDay: 31, endDay: 60 },
  { id: 'rise', startDay: 61, endDay: 90 },
];

export const WEEK_COUNT = Math.ceil(JOURNEY_LENGTH / 7); // 13

export type Status = 'done' | 'current' | 'upcoming';

/** 1-based journey day, clamped to the journey length. */
export const journeyDay = (startDate: ISODate, today: ISODate): number =>
  Math.min(Math.max(daysBetween(startDate, today) + 1, 1), JOURNEY_LENGTH);

export const isJourneyComplete = (startDate: ISODate, today: ISODate): boolean =>
  daysBetween(startDate, today) + 1 > JOURNEY_LENGTH;

export const currentPhase = (day: number): Phase =>
  PHASES.find((p) => day >= p.startDay && day <= p.endDay) ?? PHASES[PHASES.length - 1];

export const phaseStatus = (phase: Phase, day: number): Status =>
  day > phase.endDay ? 'done' : day >= phase.startDay ? 'current' : 'upcoming';

/** 1-based week index for a journey day. */
export const weekOfDay = (day: number): number => Math.ceil(day / 7);

export const weekStatus = (week: number, day: number): Status => {
  const current = weekOfDay(day);
  return week < current ? 'done' : week === current ? 'current' : 'upcoming';
};

/** Progress through a phase from 0 to 1. */
export const phaseProgress = (phase: Phase, day: number): number => {
  const length = phase.endDay - phase.startDay + 1;
  return Math.min(Math.max((day - phase.startDay + 1) / length, 0), 1);
};

/** Days since the start with at least one completed check-in. Missed days never count against you. */
export const activeDays = (log: CompletionLog, startDate: ISODate, today: ISODate): number =>
  Object.entries(log).filter(
    ([d, ids]) => ids.length > 0 && daysBetween(startDate, d) >= 0 && daysBetween(d, today) >= 0,
  ).length;

export const nextMilestone = (day: number): number | null => MILESTONE_DAYS.find((m) => m > day) ?? null;
