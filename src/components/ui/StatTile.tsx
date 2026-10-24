import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { radii, spacing, useColors } from '@/theme';

import { AppText } from './AppText';

export function StatTile({ value, label, icon }: { value: string; label: string; icon?: ReactNode }) {
  const colors = useColors();
  return (
    <View style={[styles.tile, { backgroundColor: colors.surface }]} accessible accessibilityLabel={`${label}: ${value}`}>
      <View style={styles.top}>
        <AppText variant="stat">{value}</AppText>
        {icon}
      </View>
      <AppText variant="caption" color="secondary">
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, padding: spacing.md, borderRadius: radii.md, gap: 2, minWidth: 96 },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
