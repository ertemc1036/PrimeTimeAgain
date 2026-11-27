import * as Haptics from 'expo-haptics';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Icon } from '@/components/ui';
import { addDays, daysBetween, startOfWeek } from '@/domain/dates';
import type { ISODate } from '@/domain/types';
import { formatDate } from '@/i18n/format';
import { useLocale } from '@/i18n/useLanguage';
import { colors, radii, spacing } from '@/theme';

/** Furthest day ahead that can be opened (same range as the plan editor). */
export const MAX_PLAN_DAYS = 6;

/**
 * Horizontal week (Monday–Sunday) with dates. Today is baby blue, the selected day is outlined,
 * past days with entries get a dot, future days are marked as planning days (never as done).
 */
export function WeekStrip({ today, selected, onSelect, hasEntries }: { today: ISODate; selected: ISODate; onSelect: (d: ISODate) => void; hasEntries: (d: ISODate) => boolean }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const monday = startOfWeek(selected);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const canNext = daysBetween(today, addDays(monday, 7)) <= MAX_PLAN_DAYS;
  const pick = (d: ISODate) => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    onSelect(d);
  };

  return (
    <View style={styles.row}>
      <Pressable onPress={() => pick(addDays(monday, -7))} accessibilityRole="button" accessibilityLabel={t('today.week.prev')} hitSlop={8} style={styles.arrow}>
        <Icon name="chevron-back" size={18} color={colors.textSecondary} />
      </Pressable>
      {days.map((d) => {
        const ahead = daysBetween(today, d);
        const disabled = ahead > MAX_PLAN_DAYS;
        const isToday = ahead === 0;
        const isSelected = d === selected;
        const label = formatDate(d, locale, { weekday: 'long', day: 'numeric', month: 'long' });
        return (
          <Pressable
            key={d}
            disabled={disabled}
            onPress={() => pick(d)}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected, disabled }}
            accessibilityLabel={ahead > 0 ? `${label}, ${t('today.week.planning')}` : label}
            style={[styles.day, isToday && styles.today, isSelected && !isToday && styles.selected, disabled && styles.disabled]}>
            <AppText variant="caption" color={isToday ? colors.text : 'secondary'}>
              {formatDate(d, locale, { weekday: 'narrow' })}
            </AppText>
            <AppText variant="bodyStrong" color={ahead > 0 ? colors.textSecondary : colors.text} style={styles.num}>
              {formatDate(d, locale, { day: 'numeric' })}
            </AppText>
            <View style={[styles.dot, ahead < 0 && hasEntries(d) ? styles.dotOn : ahead > 0 ? styles.dotPlan : null]} />
          </Pressable>
        );
      })}
      <Pressable
        onPress={() => pick(addDays(monday, 7))}
        disabled={!canNext}
        accessibilityRole="button"
        accessibilityLabel={t('today.week.next')}
        hitSlop={8}
        style={[styles.arrow, !canNext && styles.disabled]}>
        <Icon name="chevron-forward" size={18} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  arrow: { width: 24, height: 64, alignItems: 'center', justifyContent: 'center' },
  day: { flex: 1, minHeight: 64, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', gap: 2, paddingVertical: spacing.xs, borderWidth: 1.5, borderColor: 'transparent' },
  today: { backgroundColor: colors.primary },
  selected: { backgroundColor: colors.surface, borderColor: colors.text },
  disabled: { opacity: 0.35 },
  num: { fontVariant: ['tabular-nums'] },
  dot: { width: 5, height: 5, borderRadius: 3 },
  dotOn: { backgroundColor: colors.primaryDeep },
  dotPlan: { borderWidth: 1, borderColor: colors.disabled },
});
