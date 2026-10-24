import type { TextStyle } from 'react-native';

/**
 * System fonts (SF Pro on iOS, Roboto on Android): premium, highly legible and with full glyph
 * coverage for every future language. Hierarchy comes from weight, size and tracking.
 */
export type TextVariant =
  | 'hero'
  | 'display'
  | 'title'
  | 'heading'
  | 'subheading'
  | 'body'
  | 'bodyStrong'
  | 'caption'
  | 'label'
  | 'overline'
  | 'stat'
  | 'button';

type VariantStyle = TextStyle & {
  /** Render in capitals (done in JS so Turkish i/İ are handled correctly). */
  upper?: boolean;
};

export const textVariants: Record<TextVariant, VariantStyle> = {
  hero: { fontSize: 46, lineHeight: 48, fontWeight: '900', letterSpacing: -1.2, upper: true },
  display: { fontSize: 32, lineHeight: 36, fontWeight: '900', letterSpacing: -0.6 },
  title: { fontSize: 26, lineHeight: 31, fontWeight: '800', letterSpacing: -0.4 },
  heading: { fontSize: 19, lineHeight: 24, fontWeight: '800', letterSpacing: -0.2 },
  subheading: { fontSize: 16, lineHeight: 21, fontWeight: '700' },
  body: { fontSize: 16, lineHeight: 23 },
  bodyStrong: { fontSize: 16, lineHeight: 23, fontWeight: '600' },
  caption: { fontSize: 14, lineHeight: 19 },
  label: { fontSize: 13, lineHeight: 17, fontWeight: '600' },
  overline: { fontSize: 11, lineHeight: 14, fontWeight: '800', letterSpacing: 1.4, upper: true },
  stat: { fontSize: 34, lineHeight: 38, fontWeight: '800', letterSpacing: -0.8, fontVariant: ['tabular-nums'] },
  button: { fontSize: 15, lineHeight: 19, fontWeight: '800', letterSpacing: 0.6 },
};
