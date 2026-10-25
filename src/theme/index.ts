import { Platform, type TextStyle, type ViewStyle } from 'react-native';

/**
 * MINUS 30 design tokens — strict monochrome.
 * Secondary text uses #6E6E6E instead of the brief's #777777: visually identical, but it meets
 * WCAG AA contrast (≥ 4.5:1) on white and on card backgrounds, where #777777 does not.
 */
export const colors = {
  black: '#000000',
  white: '#FFFFFF',
  text: '#111111',
  textSecondary: '#6E6E6E',
  background: '#FFFFFF',
  backgroundAlt: '#F7F7F7',
  card: '#F5F5F5',
  border: '#E8E8E8',
  disabled: '#BDBDBD',
  overlay: 'rgba(0,0,0,0.4)',
} as const;

export const spacing = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 32, xxxl: 48 } as const;
export const radii = { sm: 12, md: 16, lg: 20, xl: 24, pill: 999 } as const;
export const layout = { screenPadding: 20, maxContentWidth: 600, minTouchTarget: 48, tabBarHeight: 64 } as const;

const shadow = (y: number, blur: number, opacity: number, elevation: number): ViewStyle =>
  Platform.select<ViewStyle>({
    android: { elevation },
    default: { shadowColor: '#000000', shadowOffset: { width: 0, height: y }, shadowRadius: blur, shadowOpacity: opacity },
  });
export const shadows = { soft: shadow(2, 8, 0.05, 1), card: shadow(6, 20, 0.07, 3), float: shadow(10, 30, 0.12, 8) } as const;

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
