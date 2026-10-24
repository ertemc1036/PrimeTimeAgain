import type { ISODate } from './types';

const pad = (n: number) => String(n).padStart(2, '0');

/** Format a Date as a local `YYYY-MM-DD` (not UTC, so "today" matches the user's day). */
export const toISODate = (d: Date): ISODate => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Parse a local `YYYY-MM-DD` at noon to avoid DST edge cases. */
export const fromISODate = (iso: ISODate): Date => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
};

export const today = (): ISODate => toISODate(new Date());

export const addDays = (iso: ISODate, days: number): ISODate => {
  const d = fromISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
};

/** Whole days from `a` to `b` (positive when b is later). */
export const daysBetween = (a: ISODate, b: ISODate): number =>
  Math.round((fromISODate(b).getTime() - fromISODate(a).getTime()) / 86_400_000);

/** The last `n` days ending with `end`, oldest first. */
export const lastNDays = (end: ISODate, n: number): ISODate[] =>
  Array.from({ length: n }, (_, i) => addDays(end, i - (n - 1)));

/** Monday-based weekday index (0 = Monday … 6 = Sunday). */
export const weekdayIndex = (iso: ISODate): number => (fromISODate(iso).getDay() + 6) % 7;

/** Monday of the week containing `iso`. */
export const startOfWeek = (iso: ISODate): ISODate => addDays(iso, -weekdayIndex(iso));

/** `YYYY-MM` key for a date. */
export const monthKey = (iso: ISODate): string => iso.slice(0, 7);

export const addMonths = (month: string, delta: number): string => {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1, 12);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};

/** Calendar grid for a month: weeks of 7 dates (Monday first), with `null` padding outside the month. */
export const monthGrid = (month: string): (ISODate | null)[][] => {
  const first = `${month}-01`;
  const [y, m] = month.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const cells: (ISODate | null)[] = Array.from({ length: weekdayIndex(first) }, () => null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(`${month}-${pad(d)}`);
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
};
