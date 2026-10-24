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
