import { checkGoalWeight, HEALTHY_BMI_MIN } from './goals';
import type { NutritionTargets } from './types';

/**
 * Personal plan from the onboarding answers – computed on the device, no server or AI involved.
 *
 * Energy: Mifflin-St Jeor resting energy × an activity factor from the weekly workouts. The formula
 * needs the body's sex; without it no calorie or macro targets are produced (an "exact" number
 * would be invented). Weight loss uses a moderate deficit with hard safety limits:
 *   • at most 25 % below the estimated energy need,
 *   • at most 1 % of body weight per week,
 *   • never below 1,200 kcal (female) / 1,500 kcal (male) – if the need itself is lower, no deficit,
 *   • no deficit at all when the goal weight is outside the healthy range (checkGoalWeight).
 * All values are orientation values, not medical advice, and must be reviewed by a nutrition
 * professional before commercial release (see docs/BETA_TESTFLIGHT.md).
 */
export type BodySex = 'female' | 'male';
export type WorkoutsPerWeek = '0' | '1-2' | '3-5' | '6+';
export type PrimaryGoal = 'lose' | 'maintain' | 'fitter';
export type Pace = 'gentle' | 'balanced' | 'custom';

export interface PlanInput {
  sex?: BodySex;
  birthYear?: number;
  heightCm?: number;
  weightKg?: number;
  goalWeightKg?: number;
  workouts?: WorkoutsPerWeek;
  goal?: PrimaryGoal;
  pace?: Pace;
  /** Current calendar year (passed in for testability). */
  year: number;
}

export interface Plan {
  /** Estimated daily energy need (kcal) – only with sex, age, height and weight. */
  tdee: number | null;
  targets: NutritionTargets | null;
  /** Planned change per week in kg (negative = loss); null when no weight goal applies. */
  weeklyKg: number | null;
  /** Rough orientation for reaching the goal weight, in weeks (a range, never a promise). */
  weeks: { min: number; max: number } | null;
  /** Kg between start and goal weight (positive = to lose). */
  toLoseKg: number | null;
  /** Daily water guide value (ml). */
  waterMl: number;
  /** Why something is missing or limited (shown honestly in the plan). */
  notes: ('needs_body_data' | 'goal_unhealthy' | 'limited_by_safety' | 'large_change')[];
}

const ACTIVITY: Record<WorkoutsPerWeek, number> = { '0': 1.2, '1-2': 1.375, '3-5': 1.55, '6+': 1.725 };
const PACE_KG: Record<Pace, number> = { gentle: 0.25, balanced: 0.5, custom: 0.75 };
const KCAL_PER_KG = 7700;
const FLOOR: Record<BodySex, number> = { female: 1200, male: 1500 };

const round = (n: number, to: number) => Math.round(n / to) * to;

export function computePlan(i: PlanInput): Plan {
  const notes: Plan['notes'] = [];
  const age = i.birthYear ? i.year - i.birthYear : undefined;
  const w = i.weightKg;
  const waterMl = w ? Math.min(3000, Math.max(1500, round(w * 30, 250))) : 2000;

  let tdee: number | null = null;
  if (i.sex && age && i.heightCm && w) {
    const bmr = 10 * w + 6.25 * i.heightCm - 5 * age + (i.sex === 'male' ? 5 : -161);
    tdee = Math.round(bmr * ACTIVITY[i.workouts ?? '0']);
  } else notes.push('needs_body_data');

  const losing = i.goal === 'lose' && !!w && !!i.goalWeightKg && i.goalWeightKg < w;
  let goalOk = true;
  if (losing) {
    const check = checkGoalWeight(i.goalWeightKg!, w, i.heightCm);
    if (!check.ok && (check.reason === 'underweight' || check.reason === 'invalid')) {
      goalOk = false;
      notes.push('goal_unhealthy');
    }
    if (!check.ok && check.reason === 'large_change') notes.push('large_change');
  }

  let weeklyKg: number | null = null;
  let kcal = tdee;
  if (losing && goalOk) {
    const wanted = PACE_KG[i.pace ?? 'balanced'];
    let deficit = (wanted * KCAL_PER_KG) / 7;
    const caps = [0.01 * w! * (KCAL_PER_KG / 7)];
    if (tdee !== null) caps.push(0.25 * tdee, tdee - FLOOR[i.sex!]);
    const cap = Math.max(0, Math.min(...caps));
    if (deficit > cap) {
      deficit = cap;
      notes.push('limited_by_safety');
    }
    weeklyKg = deficit > 0 ? -Math.round(((deficit * 7) / KCAL_PER_KG) * 100) / 100 : 0;
    if (tdee !== null) kcal = tdee - deficit;
  }

  let targets: NutritionTargets | null = null;
  if (kcal !== null && w && i.heightCm) {
    const total = round(kcal, 10);
    // Protein from a healthy reference weight (BMI 25 at most), so high body weights don't inflate it.
    const refWeight = Math.min(w, 25 * (i.heightCm / 100) ** 2);
    const protein = Math.round(1.6 * Math.max(refWeight, HEALTHY_BMI_MIN * (i.heightCm / 100) ** 2));
    const fat = Math.round((total * 0.3) / 9);
    const carbs = Math.max(0, Math.round((total - protein * 4 - fat * 9) / 4));
    targets = { kcal: total, protein, carbs, fat };
  }

  const toLoseKg = i.goal === 'lose' && w && i.goalWeightKg ? Math.round((w - i.goalWeightKg) * 10) / 10 : null;
  const weeks = weeklyKg && toLoseKg && toLoseKg > 0 ? { min: Math.max(1, Math.round((toLoseKg / -weeklyKg) * 0.85)), max: Math.max(2, Math.round((toLoseKg / -weeklyKg) * 1.3)) } : null;

  return { tdee, targets, weeklyKg, weeks, toLoseKg, waterMl, notes };
}

/** Full years between a birth date and today (for the 18+ check). */
export function ageOn(birth: { year: number; month: number; day: number }, today: Date): number {
  let age = today.getFullYear() - birth.year;
  if (today.getMonth() + 1 < birth.month || (today.getMonth() + 1 === birth.month && today.getDate() < birth.day)) age--;
  return age;
}
