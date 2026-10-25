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

/** `HH:MM` → minutes after midnight (null if invalid). */
export const parseTime = (value: string): number | null => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h < 24 && min < 60 ? h * 60 + min : null;
};

export const formatTime = (minutes: number): string => {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
};

export const nowTime = (d = new Date()): string => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** Whether a time falls inside a window; supports windows that cross midnight (e.g. 22:00–06:00). */
export const isWithinWindow = (time: string, start: string, end: string): boolean => {
  const t = parseTime(time);
  const s = parseTime(start);
  const e = parseTime(end);
  if (t === null || s === null || e === null) return true;
  if (s === e) return true;
  return s < e ? t >= s && t <= e : t >= s || t <= e;
};
