import { Platform, type TextStyle, type ViewStyle } from 'react-native';

/**
 * PrimeMe AI design tokens. Every colour in the app comes from here (the 3D stage derives its colours
 * from these too, see src/avatar/hologram.ts).
 *
 * Light grey app background with white cards, near-black type, and baby blue as a deliberate accent:
 * selected states, progress, highlights – never whole screens. Baby blue is too light for text or thin
 * icons on white, so `primaryDeep` is used there (WCAG AA on white).
 */
export const palette = {
  /** Primary Baby Blue: fills, rings, bars, selected states (always with dark content on top). */
  primary: '#A8D8FF',
  /** Soft Baby Blue: icon backgrounds, pills, selected cards. */
  primaryLight: '#E1F1FF',
  /** Light Blue Background: Prime hint cards, soft highlights. */
  primarySoft: '#F2F8FD',
  /** Accent for text and small icons on white (contrast 4.6:1). */
  primaryDeep: '#2C74BE',
  black: '#111111',
  darkGray: '#1E1F24',
  mediumGray: '#737780',
  lightGray: '#E7EBF0',
  white: '#FFFFFF',
} as const;

export const colors = {
  ...palette,
  /** Primary text. */
  text: '#101114',
  textSecondary: palette.mediumGray,
  /** App background behind cards. */
  background: '#F7F9FC',
  /** Cards and sheets. */
  surface: palette.white,
  /** Muted fill for inputs, chips, secondary buttons and list rows (on white and on the background). */
  card: '#EEF2F6',
  backgroundAlt: '#F3F6FA',
  border: palette.lightGray,
  disabled: '#C5CAD3',
  overlay: 'rgba(16,17,20,0.4)',
  /** Content on baby-blue fills. */
  onPrimary: '#101114',
  /** Text on dark (black / dark grey) surfaces. */
  onDark: palette.white,
  onDarkMuted: '#A9ADB6',
} as const;

/** Dark, neutral stage of the 3D Body Journey (the only large dark area in the app). */
export const stage = {
  background: '#0E0F12',
  panel: '#17181D',
  line: '#272932',
  text: palette.white,
  muted: colors.onDarkMuted,
  faint: '#767A84',
  /** Light colours of the model and rings: the app's baby blues. */
  accent: palette.primary,
  glow: palette.primaryLight,
  body: '#1D1F26',
  cloth: '#0E0F12',
  hair: '#17181D',
  ok: palette.primary,
  fail: '#FF8A80',
} as const;

export const spacing = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 32, xxxl: 48 } as const;
export const radii = { sm: 12, md: 16, lg: 20, xl: 24, pill: 999 } as const;
export const layout = { screenPadding: 20, maxContentWidth: 600, minTouchTarget: 48, tabBarHeight: 64 } as const;

const shadow = (y: number, blur: number, opacity: number, elevation: number): ViewStyle =>
  Platform.select<ViewStyle>({
    android: { elevation },
    default: { shadowColor: '#14213D', shadowOffset: { width: 0, height: y }, shadowRadius: blur, shadowOpacity: opacity },
  });
export const shadows = { soft: shadow(2, 10, 0.05, 1), card: shadow(8, 24, 0.07, 3), float: shadow(12, 32, 0.12, 8) } as const;

/** Inter (SIL Open Font License — free for commercial use), one family per weight. */
export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
} as const;

export type TextVariant = 'display' | 'title' | 'heading' | 'subheading' | 'body' | 'bodyStrong' | 'caption' | 'label' | 'overline' | 'stat' | 'button';

export const text: Record<TextVariant, TextStyle> = {
  display: { fontFamily: fonts.extrabold, fontSize: 40, lineHeight: 44, letterSpacing: -1.4 },
  title: { fontFamily: fonts.bold, fontSize: 30, lineHeight: 36, letterSpacing: -0.9 },
  heading: { fontFamily: fonts.bold, fontSize: 20, lineHeight: 26, letterSpacing: -0.4 },
  subheading: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22, letterSpacing: -0.2 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 23, letterSpacing: -0.1 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 23, letterSpacing: -0.1 },
  caption: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  label: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  overline: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, letterSpacing: 0.8, textTransform: 'uppercase' },
  stat: { fontFamily: fonts.bold, fontSize: 32, lineHeight: 36, letterSpacing: -1, fontVariant: ['tabular-nums'] },
  button: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 20, letterSpacing: -0.1 },
};

/** Inputs show focus with their own border; this hides the browser's default focus rectangle on web. */
export const webNoOutline: TextStyle | undefined = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : undefined;
