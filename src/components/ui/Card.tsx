import { StyleSheet, View, type ViewProps } from 'react-native';

import { colors, radii, shadows, spacing } from '@/theme';

export interface CardProps extends ViewProps {
  /**
   * filled = white card with a hairline border, outline = same on white screens, inverse = near-black
   * (premium, use sparingly), elevated = white with a soft shadow (dashboard cards), accent = light baby blue.
   */
  variant?: 'filled' | 'outline' | 'inverse' | 'elevated' | 'accent';
  padded?: boolean;
}

export function Card({ variant = 'filled', padded = true, style, ...rest }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        variant === 'filled' && { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
        variant === 'outline' && { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
        variant === 'inverse' && { backgroundColor: colors.black },
        variant === 'elevated' && styles.elevated,
        variant === 'accent' && { backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primaryLight },
        padded && styles.padded,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.xl, overflow: 'hidden' },
  // No overflow clipping, so the shadow stays visible.
  elevated: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, overflow: 'visible', ...shadows.card },
  padded: { padding: spacing.lg },
});
