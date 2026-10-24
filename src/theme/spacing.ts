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

export const radii = {
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  pill: 999,
} as const;

/** Screen side padding; generous whitespace is part of the brand. */
export const layout = {
  screenPadding: 20,
  maxContentWidth: 640,
  minTouchTarget: 44,
} as const;
