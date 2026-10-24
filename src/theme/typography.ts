import type { TextStyle } from 'react-native';

/**
 * Display font is Fraunces (elegant serif) for Latin scripts.
 * Body text uses the platform system font for best legibility and glyph coverage.
 */
export const fontFamilies = {
  display: 'Fraunces_600SemiBold',
  displayRegular: 'Fraunces_400Regular',
  body: undefined as string | undefined, // system font
} as const;

export type TextVariant =
  | 'display'
  | 'title'
  | 'heading'
  | 'subheading'
  | 'body'
  | 'bodyStrong'
  | 'caption'
  | 'label'
  | 'overline'
  | 'stat';

type VariantStyle = TextStyle & { serif?: boolean };

export const textVariants: Record<TextVariant, VariantStyle> = {
  display: { fontSize: 36, lineHeight: 42, serif: true, letterSpacing: -0.5 },
  title: { fontSize: 28, lineHeight: 34, serif: true, letterSpacing: -0.3 },
  heading: { fontSize: 21, lineHeight: 27, serif: true },
  subheading: { fontSize: 17, lineHeight: 23, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 24 },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontWeight: '600' },
  caption: { fontSize: 14, lineHeight: 20 },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  overline: { fontSize: 12, lineHeight: 16, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase' },
  stat: { fontSize: 44, lineHeight: 50, serif: true, letterSpacing: -1 },
};
