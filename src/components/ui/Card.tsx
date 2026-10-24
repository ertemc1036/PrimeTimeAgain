import { StyleSheet, View, type ViewProps } from 'react-native';

import { colors, radii, shadows, spacing } from '@/theme';

export interface CardProps extends ViewProps {
  tint?: string;
  padded?: boolean;
  elevated?: boolean;
}

export function Card({ tint = colors.surface, padded = true, elevated = true, style, ...rest }: CardProps) {
  return (
    <View
      style={[styles.card, { backgroundColor: tint }, padded && styles.padded, elevated && shadows.card, style]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.lg },
  padded: { padding: spacing.lg },
});
