import { cmToFtIn, ftInToCm, HEIGHT_LIMITS_CM, kgToLb, lbToKg, WEIGHT_LIMITS_KG } from '@/domain/goals';
import type { Units } from '@/domain/types';

export const parseNum = (s: string): number | undefined => {
  const n = Number(s.replace(',', '.').trim());
  return s.trim() && Number.isFinite(n) ? n : undefined;
};

export const weightUnit = (u: Units) => (u === 'metric' ? 'kg' : 'lb');

export const formatWeight = (kg: number, u: Units) => (u === 'metric' ? `${Math.round(kg * 10) / 10} kg` : `${kgToLb(kg)} lb`);

export const weightToInput = (kg: number | undefined, u: Units) => (kg === undefined ? '' : String(u === 'metric' ? Math.round(kg * 10) / 10 : kgToLb(kg)));

/** Parse a weight typed in the user's unit. Returns null when out of realistic bounds. */
export function parseWeight(text: string, u: Units): number | null | undefined {
  const n = parseNum(text);
  if (n === undefined) return undefined;
  const kg = u === 'metric' ? n : lbToKg(n);
  return kg >= WEIGHT_LIMITS_KG.min && kg <= WEIGHT_LIMITS_KG.max ? Math.round(kg * 10) / 10 : null;
}

export function parseHeight(cm: string, ft: string, inch: string, u: Units): number | null | undefined {
  let value: number | undefined;
  if (u === 'metric') value = parseNum(cm);
  else {
    const f = parseNum(ft);
    if (f === undefined) return undefined;
    value = ftInToCm(f, parseNum(inch) ?? 0);
  }
  if (value === undefined) return undefined;
  return value >= HEIGHT_LIMITS_CM.min && value <= HEIGHT_LIMITS_CM.max ? Math.round(value) : null;
}

export const heightToInputs = (cm: number | undefined) => {
  if (!cm) return { cm: '', ft: '', inch: '' };
  const r = cmToFtIn(cm);
  return { cm: String(cm), ft: String(r.ft), inch: String(r.in) };
};
