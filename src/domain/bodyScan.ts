import { weightProgress } from './bodyStats';
import type { AppData } from './types';

/**
 * Weight-driven body scan.
 *
 * Every avatar model holds two shapes of the same body: the slimmer "goal" shape and the fuller
 * "start" shape, blended continuously on the device (see src/avatar/buildAvatar.ts). The scan
 * therefore only needs one number per state: `fullness`, 0 = goal shape … 1 = start shape.
 *
 * Mapping (first version, deliberately simple and symbolic):
 * 1. Start and goal weight known and the goal is to lose weight → position of the current weight
 *    between them: at the start weight the full start shape, at the goal weight the goal shape.
 * 2. Otherwise, height known → body-mass index mapped onto the same range (BMI ≤ 21 → 0,
 *    BMI ≥ 32 → 1). Only to make the scan react to weight; never shown as a number or judged.
 * 3. No usable data → the start shape.
 * The value is rounded to steps of 0.05 so small daily fluctuations don't make the body jump.
 *
 * Extension points: more shapes per model (e.g. a heavier and a more muscular target) can be added
 * as further morph targets; `BodyScanState` would then carry a weight per target instead of one
 * number, and Prime Muscle could map training data onto the muscular target.
 */
export type BodyView = 'start' | 'current' | 'goal';

export interface BodyScanState {
  /** 0 = goal shape … 1 = start shape. */
  fullness: number;
  /** Where the value comes from (shown as a short note, used by tests). */
  basis: 'progress' | 'bmi' | 'none';
}

const BMI_LOW = 21;
const BMI_HIGH = 32;
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const step = (n: number) => Math.round(clamp01(n) * 20) / 20;

export function bodyScanState(input: { startKg: number | null; goalKg: number | null; currentKg: number | null; heightCm: number | null }): BodyScanState {
  const { startKg, goalKg, currentKg, heightCm } = input;
  if (currentKg === null) return { fullness: 1, basis: 'none' };
  if (startKg !== null && goalKg !== null && startKg - goalKg >= 1) {
    return { fullness: step((currentKg - goalKg) / (startKg - goalKg)), basis: 'progress' };
  }
  if (heightCm && heightCm >= 120 && heightCm <= 230) {
    const bmi = currentKg / (heightCm / 100) ** 2;
    return { fullness: step((bmi - BMI_LOW) / (BMI_HIGH - BMI_LOW)), basis: 'bmi' };
  }
  return { fullness: 1, basis: 'none' };
}

/** The scan state for the user's data. */
export function bodyScanFor(data: Pick<AppData, 'profile' | 'weights'>): BodyScanState {
  const w = weightProgress(data);
  return bodyScanState({ startKg: w.startKg, goalKg: w.goalKg, currentKg: w.currentKg, heightCm: data.profile?.heightCm ?? null });
}

/** Fullness to show for the selected view. */
export const fullnessFor = (view: BodyView, state: BodyScanState): number => (view === 'start' ? 1 : view === 'goal' ? 0 : state.fullness);
