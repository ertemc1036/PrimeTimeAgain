import { StyleSheet, View, type ViewProps } from 'react-native';

import { colors, radii, spacing } from '@/theme';

export interface CardProps extends ViewProps {
  /** filled = soft grey, outline = white with hairline border, inverse = black */
  variant?: 'filled' | 'outline' | 'inverse';
  padded?: boolean;
}

export function Card({ variant = 'filled', padded = true, style, ...rest }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        variant === 'filled' && { backgroundColor: colors.card },
        variant === 'outline' && { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
        variant === 'inverse' && { backgroundColor: colors.black },
        padded && styles.padded,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.lg, overflow: 'hidden' },
  padded: { padding: spacing.lg },
});
