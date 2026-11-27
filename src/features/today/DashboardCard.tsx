import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, Icon, PressableScale, type IconName } from '@/components/ui';
import { colors, radii, shadows, spacing } from '@/theme';

/** White dashboard card on Today: icon, title, chevron; the whole card opens its tab or screen. */
export function DashboardCard({ icon, title, onPress, children, testID }: { icon: IconName; title: string; onPress: () => void; children: ReactNode; testID?: string }) {
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityLabel={title} style={styles.card} testID={testID}>
      <View style={styles.head}>
        <View style={styles.icon}>
          <Icon name={icon} size={18} color={colors.black} />
        </View>
        <AppText variant="subheading" style={styles.flex}>
          {title}
        </AppText>
        <Icon name="chevron-forward" size={18} color={colors.textSecondary} />
      </View>
      {children}
    </PressableScale>
  );
}

/** Compact number tile (Today stats row). */
export function MetricTile({ icon, label, value, sub, onPress }: { icon: IconName; label: string; value: string; sub?: string; onPress?: () => void }) {
  return (
    <PressableScale onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined} accessibilityLabel={`${label}: ${value}${sub ? ` ${sub}` : ''}`} style={styles.tile}>
      <Icon name={icon} size={18} color={colors.text} />
      <AppText variant="heading" numberOfLines={1} adjustsFontSizeToFit style={styles.tabular}>
        {value}
      </AppText>
      <AppText variant="caption" color="secondary" numberOfLines={1}>
        {sub ? `${label} · ${sub}` : label}
      </AppText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing.lg, gap: spacing.sm, ...shadows.card },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  icon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  tile: {
    flex: 1,
    minHeight: 96,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: 2,
    justifyContent: 'flex-end',
    ...shadows.soft,
  },
  tabular: { fontVariant: ['tabular-nums'] },
});
