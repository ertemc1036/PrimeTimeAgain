import { Text, type TextProps, type TextStyle } from 'react-native';

import { colors, text, type TextVariant } from '@/theme';

export interface AppTextProps extends TextProps {
  variant?: TextVariant;
  /** 'secondary' = grey secondary text; any other string is a colour. */
  color?: 'secondary' | string;
  align?: TextStyle['textAlign'];
}

export function AppText({ variant = 'body', color, align, style, ...rest }: AppTextProps) {
  const heading = variant === 'display' || variant === 'title' || variant === 'heading';
  return (
    <Text
      accessibilityRole={heading ? 'header' : undefined}
      maxFontSizeMultiplier={heading || variant === 'stat' ? 1.3 : 1.6}
      style={[text[variant], { color: color === 'secondary' ? colors.textSecondary : (color ?? colors.text), textAlign: align }, style]}
      {...rest}
    />
  );
}
