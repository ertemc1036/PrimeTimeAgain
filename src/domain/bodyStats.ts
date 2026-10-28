import type { AppData } from './types';

export interface WeightProgress {
  /** Profile start weight, otherwise the first logged weight. */
  startKg: number | null;
  /** Latest logged weight (by date), otherwise the start weight. */
  currentKg: number | null;
  /** Date of the latest logged weight, if any. */
  currentDate: string | null;
  /** current − start (negative = lost). Null without both values. */
  changeKg: number | null;
  goalKg: number | null;
  /** 0..1 share of the way from start to goal. Null when there is no goal or start equals goal. */
  progress: number | null;
  /** Remaining distance to the goal (always ≥ 0). */
  remainingKg: number | null;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Weight numbers for the Today avatar card, from the user's own entries only.
 * Works for losing, gaining and maintaining goals; nothing about body composition is inferred.
 */
export function weightProgress(data: Pick<AppData, 'profile' | 'weights'>): WeightProgress {
  const sorted = [...data.weights].sort((a, b) => (a.date === b.date ? (a.updatedAt < b.updatedAt ? -1 : 1) : a.date < b.date ? -1 : 1));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const startKg = data.profile?.startWeightKg ?? first?.kg ?? null;
  const currentKg = last?.kg ?? startKg;
  const goalKg = data.profile?.goalWeightKg ?? null;
  const changeKg = startKg !== null && currentKg !== null && last ? round1(currentKg - startKg) : startKg !== null && currentKg !== null ? 0 : null;
  let progress: number | null = null;
  let remainingKg: number | null = null;
  if (goalKg !== null && currentKg !== null) {
    remainingKg = round1(Math.abs(goalKg - currentKg));
    if (startKg !== null && startKg !== goalKg) {
      const p = (startKg - currentKg) / (startKg - goalKg);
      progress = Math.min(1, Math.max(0, p));
    }
  }
  return { startKg, currentKg, currentDate: last?.date ?? null, changeKg, goalKg, progress, remainingKg };
}
