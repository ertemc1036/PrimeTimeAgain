/**
 * Goal safeguards. MINUS 30 never assigns a weight target and never prescribes calorie deficits.
 * These checks only flag goals outside a generally healthy range and point to professional advice.
 */
export const WEIGHT_LIMITS_KG = { min: 30, max: 350 } as const;
export const HEIGHT_LIMITS_CM = { min: 120, max: 230 } as const;
export const HEALTHY_BMI_MIN = 18.5;

export const bmi = (kg: number, cm: number) => kg / (cm / 100) ** 2;

export type GoalCheck =
  | { ok: true }
  | { ok: false; reason: 'invalid' | 'underweight' | 'large_change'; minHealthyKg?: number };

/** Check an optional goal weight. Returns guidance, never a prescription. */
export function checkGoalWeight(goalKg: number, currentKg?: number, heightCm?: number): GoalCheck {
  if (!(goalKg >= WEIGHT_LIMITS_KG.min && goalKg <= WEIGHT_LIMITS_KG.max)) return { ok: false, reason: 'invalid' };
  if (heightCm && bmi(goalKg, heightCm) < HEALTHY_BMI_MIN) {
    return { ok: false, reason: 'underweight', minHealthyKg: Math.ceil(HEALTHY_BMI_MIN * (heightCm / 100) ** 2) };
  }
  // A change of more than 30% of current weight deserves professional support; it is a note, not a block.
  if (currentKg && Math.abs(currentKg - goalKg) / currentKg > 0.3) return { ok: false, reason: 'large_change' };
  return { ok: true };
}

export const kgToLb = (kg: number) => Math.round(kg * 2.20462 * 10) / 10;
export const lbToKg = (lb: number) => Math.round((lb / 2.20462) * 10) / 10;
export const cmToFtIn = (cm: number) => {
  const inches = Math.round(cm / 2.54);
  return { ft: Math.floor(inches / 12), in: inches % 12 };
};
export const ftInToCm = (ft: number, inches: number) => Math.round((ft * 12 + inches) * 2.54);
