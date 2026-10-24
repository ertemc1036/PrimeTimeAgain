import type { MetricId, Preferences } from '@/domain/types';

/** Measurements are stored in metric; converted only for display and entry. */
export const unitFor = (metric: MetricId, units: Preferences['units']) =>
  metric === 'weight' ? (units === 'imperial' ? 'lb' : 'kg') : metric === 'waist' ? (units === 'imperial' ? 'in' : 'cm') : null;

export const toDisplay = (metric: MetricId, value: number, units: Preferences['units']) => {
  if (units !== 'imperial') return value;
  if (metric === 'weight') return Math.round(value * 2.20462 * 10) / 10;
  if (metric === 'waist') return Math.round((value / 2.54) * 10) / 10;
  return value;
};

export const fromDisplay = (metric: MetricId, value: number, units: Preferences['units']) => {
  if (units !== 'imperial') return value;
  if (metric === 'weight') return Math.round((value / 2.20462) * 10) / 10;
  if (metric === 'waist') return Math.round(value * 2.54 * 10) / 10;
  return value;
};

/** Plausibility bounds (metric) to catch typos, not to judge anyone. */
export const BOUNDS: Record<'weight' | 'waist', [number, number]> = { weight: [25, 350], waist: [40, 250] };
