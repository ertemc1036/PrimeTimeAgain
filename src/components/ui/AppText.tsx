import { Children } from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';

import { toUpper } from '@/i18n/upper';
import { useLanguage } from '@/i18n/useLanguage';
import { textVariants, useColors, type TextVariant } from '@/theme';

export interface AppTextProps extends TextProps {
  variant?: TextVariant;
  /** 'secondary' uses the theme's secondary text colour; any other string is a colour. */
  color?: 'secondary' | string;
  align?: TextStyle['textAlign'];
  upper?: boolean;
}

/** All text goes through here so typography and capitalisation stay consistent. */
export function AppText({ variant = 'body', color, align, upper, style, children, ...rest }: AppTextProps) {
  const colors = useColors();
  const { code } = useLanguage();
  const { upper: variantUpper, ...base } = textVariants[variant];
  const isHeading = variant === 'hero' || variant === 'display' || variant === 'title' || variant === 'heading';
  const shouldUpper = upper ?? variantUpper;
  const content = shouldUpper
    ? Children.map(children, (c) => (typeof c === 'string' ? toUpper(c, code) : c))
    : children;

  return (
    <Text
      accessibilityRole={isHeading ? 'header' : undefined}
      maxFontSizeMultiplier={isHeading || variant === 'stat' ? 1.35 : 1.7}
      style={[base, { color: color === 'secondary' ? colors.textSecondary : (color ?? colors.text), textAlign: align }, style]}
      {...rest}>
      {content}
    </Text>
  );
}
