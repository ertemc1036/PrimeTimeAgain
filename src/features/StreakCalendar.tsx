import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Card, Icon, IconButton } from '@/components/ui';
import { calendarStatus, canEditCheckIns, dayChecks, startDate, type CalendarStatus } from '@/domain/completion';
import { addMonths, monthGrid, monthKey } from '@/domain/dates';
import type { AppData, ISODate } from '@/domain/types';
import { formatDate } from '@/i18n/format';
import { useLocale } from '@/i18n/useLanguage';
import { colors, fonts, radii, spacing } from '@/theme';

const WEEKDAYS = ['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05', '2024-01-06', '2024-01-07'];

/** Monthly streak calendar. Black = complete, grey = partial, outline = incomplete. */
export function StreakCalendar({ data, today }: { data: AppData; today: ISODate }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const [month, setMonth] = useState(monthKey(today));
  const [selected, setSelected] = useState<ISODate | null>(null);
  const start = startDate(data);
  const grid = useMemo(() => monthGrid(month), [month]);
  const canGoNext = month < monthKey(today);
  const canGoPrev = !start || month > monthKey(start);

  const selectedChecks = selected ? dayChecks(data, selected) : null;

  return (
    <Card variant="outline">
      <View style={styles.header}>
        <IconButton icon="chevron-back" label={t('calendar.previous')} onPress={() => canGoPrev && setMonth(addMonths(month, -1))} variant="plain" color={canGoPrev ? colors.text : colors.disabled} />
        <AppText variant="subheading" accessibilityRole="header">
          {formatDate(`${month}-01`, locale, { month: 'long', year: 'numeric' })}
        </AppText>
        <IconButton icon="chevron-forward" label={t('calendar.next')} onPress={() => canGoNext && setMonth(addMonths(month, 1))} variant="plain" color={canGoNext ? colors.text : colors.disabled} />
      </View>
      <View style={styles.row}>
        {WEEKDAYS.map((d) => (
          <AppText key={d} variant="label" color="secondary" style={styles.weekday}>
            {formatDate(d, locale, { weekday: 'narrow' })}
          </AppText>
        ))}
      </View>
      {grid.map((week, i) => (
        <View key={i} style={styles.row}>
          {week.map((date, j) => {
            if (!date) return <View key={j} style={styles.cell} />;
            const status = calendarStatus(data, date, today, start);
            const isSel = selected === date;
            return (
              <Pressable
                key={date}
                style={styles.cell}
                onPress={() => setSelected(isSel ? null : date)}
                disabled={status === 'future'}
                accessibilityRole="button"
                accessibilityState={{ selected: isSel }}
                accessibilityLabel={t('calendar.dayA11y', { date: formatDate(date, locale, { day: 'numeric', month: 'long' }), status: t(`calendar.status.${status}`) })}>
                <DayDot status={status} label={String(Number(date.slice(8)))} isToday={date === today} selected={isSel} />
              </Pressable>
            );
          })}
        </View>
      ))}
      <View style={styles.legend}>
        <Legend swatch={<View style={[styles.swatch, styles.complete]} />} label={t('calendar.legend.complete')} />
        <Legend swatch={<View style={[styles.swatch, styles.partial]} />} label={t('calendar.legend.partial')} />
        <Legend swatch={<View style={[styles.swatch, styles.incomplete]} />} label={t('calendar.legend.incomplete')} />
      </View>
      {selected && selectedChecks ? (
        <View style={styles.breakdown} accessibilityLiveRegion="polite">
          <AppText variant="bodyStrong">{formatDate(selected, locale, { weekday: 'long', day: 'numeric', month: 'long' })}</AppText>
          <Check label={t('calendar.breakdown.food')} done={selectedChecks.food} />
          <Check label={t('calendar.breakdown.activity')} done={selectedChecks.activity} />
          <Check label={t('calendar.breakdown.planning')} done={selectedChecks.planning} />
          {selected !== today && canEditCheckIns(selected, today) && !selectedChecks.complete ? (
            <AppText variant="caption" color="secondary">
              {t('calendar.graceNote')}
            </AppText>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

function DayDot({ status, label, isToday, selected }: { status: CalendarStatus; label: string; isToday: boolean; selected: boolean }) {
  const style =
    status === 'complete' ? styles.complete : status === 'partial' ? styles.partial : status === 'incomplete' ? styles.incomplete : status === 'today' ? styles.todayDot : styles.neutral;
  const fg = status === 'complete' ? colors.white : status === 'future' || status === 'before' ? colors.disabled : colors.text;
  return (
    <View style={[styles.dot, style, isToday && styles.todayRing, selected && styles.selected]}>
      <AppText variant="label" color={fg} style={isToday ? styles.bold : undefined}>
        {label}
      </AppText>
    </View>
  );
}

function Legend({ swatch, label }: { swatch: React.ReactNode; label: string }) {
  return (
    <View style={styles.legendItem}>
      {swatch}
      <AppText variant="label" color="secondary">
        {label}
      </AppText>
    </View>
  );
}

function Check({ label, done }: { label: string; done: boolean }) {
  return (
    <View style={styles.check}>
      <Icon name={done ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={done ? colors.black : colors.disabled} />
      <AppText variant="body" color={done ? undefined : 'secondary'}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: -spacing.xs, marginBottom: spacing.xs },
  row: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', paddingBottom: spacing.xs },
  cell: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', maxHeight: 48 },
  dot: { width: 36, height: 36, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  complete: { backgroundColor: colors.black },
  partial: { backgroundColor: colors.border },
  incomplete: { borderWidth: 1.5, borderColor: colors.disabled },
  todayDot: { backgroundColor: colors.white },
  neutral: {},
  todayRing: { borderWidth: 2, borderColor: colors.black },
  selected: { transform: [{ scale: 1.08 }] },
  bold: { fontFamily: fonts.bold },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.sm, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 12, height: 12, borderRadius: 6 },
  breakdown: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, gap: spacing.xs },
  check: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
