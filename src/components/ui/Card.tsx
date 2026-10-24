import { StyleSheet, View, type ViewProps } from 'react-native';

import { radii, spacing, useColors } from '@/theme';

export interface CardProps extends ViewProps {
  variant?: 'filled' | 'outline' | 'inverse';
  padded?: boolean;
}

/** Flat, precise surfaces: filled (pearl / night), outlined, or inverse (black on light). */
export function Card({ variant = 'filled', padded = true, style, ...rest }: CardProps) {
  const colors = useColors();
  const bg = variant === 'filled' ? colors.surface : variant === 'inverse' ? colors.accent : 'transparent';
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: bg },
        variant === 'outline' && { borderWidth: 1, borderColor: colors.border },
        padded && styles.padded,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.md, overflow: 'hidden' },
  padded: { padding: spacing.md },
});
