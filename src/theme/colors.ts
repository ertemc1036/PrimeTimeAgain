/**
 * PrimeTimeAgain V2: premium black & white "mission control".
 * Accent colours are used only where they carry meaning (day types / status), always as fills
 * with black text so contrast stays above WCAG AA.
 */
export const palette = {
  white: '#FFFFFF',
  pearl: '#F4F4F2',
  black: '#08090B',
  graphite: '#202126',
  silver: '#B7B7B7',
  // Derived neutrals
  ink2: '#5E5F66', // secondary text on light (≥ 5.7:1)
  line: '#E4E4E0',
  night: '#111216', // raised surface on dark
  nightLine: '#2A2B31',
  mist: '#9A9BA3', // secondary text on dark (7.2:1)
} as const;

/** Meaningful status accents (fills). */
export const status = {
  prime: '#22C55E',
  active: '#8B9BFF',
  recovery: '#F5A524',
  missed: '#B7B7B7',
  danger: '#C2412D',
} as const;

export interface ThemeColors {
  mode: 'light' | 'dark';
  background: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textSecondary: string;
  border: string;
  /** Strong action fill (black on light, white on dark). */
  accent: string;
  onAccent: string;
  track: string;
  overlay: string;
}

export const lightColors: ThemeColors = {
  mode: 'light',
  background: palette.white,
  surface: palette.pearl,
  surfaceAlt: palette.white,
  text: palette.black,
  textSecondary: palette.ink2,
  border: palette.line,
  accent: palette.black,
  onAccent: palette.white,
  track: palette.line,
  overlay: 'rgba(8, 9, 11, 0.45)',
};

export const darkColors: ThemeColors = {
  mode: 'dark',
  background: palette.black,
  surface: palette.night,
  surfaceAlt: palette.graphite,
  text: palette.white,
  textSecondary: palette.mist,
  border: palette.nightLine,
  accent: palette.white,
  onAccent: palette.black,
  track: palette.nightLine,
  overlay: 'rgba(0, 0, 0, 0.6)',
};
