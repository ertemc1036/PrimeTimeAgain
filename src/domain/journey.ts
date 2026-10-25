import { daysBetween, fromISODate, toISODate } from './dates';
import type { ISODate } from './types';

/**
 * Optional seven-month journey. Phases are about habits, never about fixed weight-loss targets.
 * Months are calendar months from the start date. After month 7 the app offers Maintenance Mode.
 */
export const JOURNEY_MONTHS = 7;
export const MONTH_KEYS = ['foundation', 'nutrition', 'movement', 'consistency', 'progress', 'sustainability', 'maintenance'] as const;
export type MonthKey = (typeof MONTH_KEYS)[number];

export const addCalendarMonths = (iso: ISODate, months: number): ISODate => {
  const d = fromISODate(iso);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return toISODate(d);
};

export const journeyEnd = (start: ISODate) => addCalendarMonths(start, JOURNEY_MONTHS);

export interface JourneyPosition {
  /** 1–7 while active; 8 means finished. */
  month: number;
  finished: boolean;
  /** Progress through the whole journey, 0–1. */
  progress: number;
  dayNumber: number;
}

export function journeyPosition(start: ISODate, today: ISODate): JourneyPosition {
  const total = daysBetween(start, journeyEnd(start));
  const elapsed = Math.max(daysBetween(start, today), 0);
  let month = 1;
  while (month <= JOURNEY_MONTHS && daysBetween(addCalendarMonths(start, month), today) >= 0) month++;
  return { month, finished: month > JOURNEY_MONTHS, progress: Math.min(elapsed / total, 1), dayNumber: elapsed + 1 };
}
