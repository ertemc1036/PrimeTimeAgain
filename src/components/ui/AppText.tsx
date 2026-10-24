import { Text, type TextProps, type TextStyle } from 'react-native';

import { useLanguage } from '@/i18n/useLanguage';
import { colors, fontFamilies, textVariants, type TextVariant } from '@/theme';

export interface AppTextProps extends TextProps {
  variant?: TextVariant;
  color?: string;
  align?: TextStyle['textAlign'];
}

/**
 * All text goes through here so typography stays consistent.
 * Headings use the display serif for Latin scripts and the system font otherwise.
 */
export function AppText({ variant = 'body', color = colors.text, align, style, ...rest }: AppTextProps) {
  const { useDisplayFont } = useLanguage();
  const { serif, ...base } = textVariants[variant];
  const font: TextStyle | undefined = serif
    ? useDisplayFont
      ? { fontFamily: fontFamilies.display, fontWeight: 'normal' }
      : { fontWeight: '700' }
    : undefined;
  const isHeading = variant === 'display' || variant === 'title' || variant === 'heading';

  return (
    <Text
      accessibilityRole={isHeading ? 'header' : undefined}
      maxFontSizeMultiplier={serif ? 1.4 : 1.8}
      style={[base, font, { color, textAlign: align }, style]}
      {...rest}
    />
  );
}
