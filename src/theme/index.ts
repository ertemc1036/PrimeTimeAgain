import { Platform, type TextStyle, type ViewStyle } from 'react-native';

/**
 * PrimeMe AI design tokens: black, white, greys and silver – a calm, monochrome look in the spirit of
 * native iOS. Every colour in the app comes from here. Food photos keep their natural colours; the
 * interface itself stays monochrome. Prime's artwork (assets/images/prime) is the only illustration.
 */
export const palette = {
  black: '#000000',
  /** Primary text. */
  ink: '#1D1D1F',
  /** Secondary text. */
  mediumGray: '#86868B',
  graphite: '#2C2C2E',
  gray: '#AEAEB2',
  silver: '#E5E5EA',
  softBackground: '#F5F5F7',
  white: '#FFFFFF',
} as const;

export const colors = {
  ...palette,
  text: palette.ink,
  textSecondary: palette.mediumGray,
  textTertiary: palette.gray,
  /** App background behind cards. */
  background: palette.softBackground,
  /** Cards, sheets, the tab bar. */
  surface: palette.white,
  /** Translucent grey fill (like iOS system fills): secondary buttons, chips, inputs, icon circles. Works on white and on the background. */
  card: 'rgba(118,118,128,0.12)',
  /** Slightly stronger fill for selected options. */
  selected: 'rgba(118,118,128,0.2)',
  /** Progress rings and bars, switches: monochrome accent. */
  accent: palette.ink,
  /** Track behind rings and bars. */
  track: palette.silver,
  border: palette.silver,
  disabled: '#C7C7CC',
  overlay: 'rgba(0,0,0,0.4)',
  /** Text on dark (black / graphite) surfaces. */
  onDark: palette.white,
  onDarkMuted: palette.gray,
  /** Background of Prime's artwork (the renders sit on near-black). */
  primeBackdrop: '#03010C',
} as const;

/** Onboarding (reference design: white, black type, one question per screen). */
export const onboarding = {
  background: '#FFFFFF',
  text: '#111111',
  secondary: '#86868B',
  button: '#111111',
  buttonDisabled: '#B5B5B7',
  card: '#FFFFFF',
  soft: '#F5F5F7',
  border: '#E5E5EA',
  selected: '#111111',
  progress: '#111111',
  gutter: 24,
} as const;

/** Dark, neutral stage of the optional 3D body view (disabled in this version, see src/config/features.ts). */
export const stage = {
  background: '#0E0E10',
  panel: '#1C1C1E',
  line: palette.graphite,
  text: palette.white,
  muted: palette.gray,
  faint: '#8E8E93',
  accent: palette.silver,
  glow: palette.white,
  body: '#1C1C1E',
  cloth: '#0E0E10',
  hair: '#1C1C1E',
  ok: palette.silver,
  fail: '#FF6961',
} as const;

export const spacing = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 32, xxxl: 48 } as const;
export const radii = { sm: 12, md: 16, lg: 20, xl: 24, pill: 999 } as const;
export const layout = { screenPadding: 20, maxContentWidth: 600, minTouchTarget: 48, tabBarHeight: 64 } as const;

const shadow = (y: number, blur: number, opacity: number, elevation: number): ViewStyle =>
  Platform.select<ViewStyle>({
    android: { elevation },
    default: { shadowColor: '#000000', shadowOffset: { width: 0, height: y }, shadowRadius: blur, shadowOpacity: opacity },
  });
export const shadows = { soft: shadow(1, 6, 0.04, 1), card: shadow(4, 16, 0.05, 2), float: shadow(8, 24, 0.12, 6) } as const;

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
