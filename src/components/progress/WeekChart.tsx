import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui';
import type { DayCompletion } from '@/domain/primeScore';
import type { ISODate } from '@/domain/types';
import { formatDate } from '@/i18n/format';
import { useLanguage } from '@/i18n/useLanguage';
import { colors, radii, spacing } from '@/theme';

const CHART_HEIGHT = 140;

/** Simple, accessible bar chart of daily completion. Each bar is announced individually. */
export function WeekChart({ days, today }: { days: DayCompletion[]; today: ISODate }) {
  const { t } = useTranslation();
  const { code } = useLanguage();

  return (
    <View style={styles.chart}>
      {days.map((d, i) => {
        const pct = Math.round(d.ratio * 100);
        const isToday = d.date === today;
        const dayName = formatDate(d.date, code, { weekday: 'short' });
        return (
          <View
            key={d.date}
            style={styles.col}
            accessible
            accessibilityLabel={t('progress.chartA11y', { day: formatDate(d.date, code, { weekday: 'long' }), percent: pct })}>
            <View style={styles.track}>
              <Animated.View
                entering={FadeInUp.delay(i * 60).duration(500)}
                style={[
                  styles.bar,
                  { height: `${Math.max(pct, 4)}%`, backgroundColor: isToday ? colors.primary : colors.primarySoft },
                ]}
              />
            </View>
            <AppText variant="label" color={isToday ? colors.primaryText : colors.textMuted}>
              {dayName}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  chart: { flexDirection: 'row', gap: spacing.xs, alignItems: 'flex-end' },
  col: { flex: 1, alignItems: 'center', gap: spacing.xs },
  track: {
    height: CHART_HEIGHT,
    width: '100%',
    maxWidth: 36,
    justifyContent: 'flex-end',
    borderRadius: radii.sm,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  bar: { width: '100%', borderRadius: radii.sm },
});
