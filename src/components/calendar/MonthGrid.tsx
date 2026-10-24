import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, PressableScale, useDayTypeColor } from '@/components/ui';
import { monthGrid } from '@/domain/dates';
import type { DayType } from '@/domain/days';
import type { ISODate } from '@/domain/types';
import { formatDate } from '@/i18n/format';
import { useLanguage } from '@/i18n/useLanguage';
import { radii, spacing, useColors } from '@/theme';

// 2024-01-01 was a Monday; used to produce localised weekday initials.
const WEEKDAY_DATES = ['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05', '2024-01-06', '2024-01-07'];

export function MonthGrid({
  month,
  today,
  selected,
  typeOf,
  onSelect,
}: {
  month: string;
  today: ISODate;
  selected: ISODate;
  typeOf: (date: ISODate) => DayType;
  onSelect: (date: ISODate) => void;
}) {
  const { t } = useTranslation();
  const { code } = useLanguage();
  const colors = useColors();
  const colorFor = useDayTypeColor();

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {WEEKDAY_DATES.map((d) => (
          <AppText key={d} variant="label" color="secondary" align="center" style={styles.cell}>
            {formatDate(d, code, { weekday: 'narrow' })}
          </AppText>
        ))}
      </View>
      {monthGrid(month).map((week, i) => (
        <View key={i} style={styles.row}>
          {week.map((date, j) => {
            if (!date) return <View key={j} style={styles.cell} />;
            const type = typeOf(date);
            const c = colorFor(type);
            const isSelected = date === selected;
            const isToday = date === today;
            return (
              <PressableScale
                key={date}
                onPress={() => onSelect(date)}
                scaleTo={0.9}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={t('calendar.dayA11y', {
                  date: formatDate(date, code, { weekday: 'long', day: 'numeric', month: 'long' }),
                  type: t(`dayTypes.${type}`),
                })}
                style={styles.cell}>
                <View
                  style={[
                    styles.day,
                    { backgroundColor: c.fill, borderColor: c.outline ?? 'transparent', borderWidth: c.outline ? 1.5 : 0 },
                    isSelected && { borderColor: colors.text, borderWidth: 2.5 },
                  ]}>
                  <AppText variant="label" color={c.text} style={isToday && styles.todayText}>
                    {String(Number(date.slice(8)))}
                  </AppText>
                </View>
              </PressableScale>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  row: { flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  day: { width: 40, height: 40, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  todayText: { fontWeight: '900', textDecorationLine: 'underline' },
});
