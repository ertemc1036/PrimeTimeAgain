export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/** Tighter, more technical radii than the v1 wellness look. */
export const radii = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  pill: 999,
} as const;

export const layout = {
  screenPadding: 20,
  maxContentWidth: 640,
  minTouchTarget: 44,
} as const;
