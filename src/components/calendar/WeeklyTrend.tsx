import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui';
import type { Tally } from '@/domain/progress';
import { radii, spacing, useColors } from '@/theme';

/** Simple accessible bar chart of weekly completion. */
export function WeeklyTrend({ weeks, label }: { weeks: { week: number; tally: Tally; current: boolean }[]; label: (week: number) => string }) {
  const { t } = useTranslation();
  const colors = useColors();
  const visible = weeks.slice(-8);
  return (
    <View style={styles.chart}>
      {visible.map((w) => {
        const pct = w.tally.percent ?? 0;
        return (
          <View key={w.week} style={styles.col} accessible accessibilityLabel={`${label(w.week)}: ${t('common.percent', { value: pct })}`}>
            <AppText variant="label" color="secondary">
              {w.tally.percent === null ? '–' : String(pct)}
            </AppText>
            <View style={[styles.track, { backgroundColor: colors.track }]}>
              <View style={[styles.bar, { height: `${Math.max(pct, 3)}%`, backgroundColor: w.current ? colors.textSecondary : colors.accent }]} />
            </View>
            <AppText variant="label" color={w.current ? colors.text : 'secondary'}>
              {String(w.week)}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  chart: { flexDirection: 'row', gap: spacing.xs, alignItems: 'flex-end' },
  col: { flex: 1, alignItems: 'center', gap: 4, maxWidth: 44 },
  track: { height: 96, width: '100%', borderRadius: radii.xs, justifyContent: 'flex-end', overflow: 'hidden' },
  bar: { width: '100%', borderRadius: radii.xs },
});
