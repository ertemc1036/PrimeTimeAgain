import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { MonthGrid } from '@/components/calendar/MonthGrid';
import { WeeklyTrend } from '@/components/calendar/WeeklyTrend';
import { MissionCard } from '@/components/missions/MissionCard';
import { AppText, Banner, Button, Card, DayTypeDot, IconButton, Screen, SectionHeader, StatTile } from '@/components/ui';
import { addMonths, monthKey } from '@/domain/dates';
import { canScheduleRecovery, dayType, MAX_RECOVERY_PER_WEEK, type DayType } from '@/domain/days';
import { overallProgress, weeklyTallies } from '@/domain/progress';
import type { ISODate } from '@/domain/types';
import { formatDate } from '@/i18n/format';
import { useLanguage } from '@/i18n/useLanguage';
import { useAppState } from '@/state/AppStateProvider';
import { useGoalsById, useStreak } from '@/state/selectors';
import { spacing } from '@/theme';

const LEGEND: DayType[] = ['prime', 'active', 'recovery', 'missed'];

export default function CalendarScreen() {
  const { t } = useTranslation();
  const { code } = useLanguage();
  const { data, today, dispatch } = useAppState();
  const goals = useGoalsById();
  const streak = useStreak();
  const [month, setMonth] = useState(monthKey(today));
  const [selected, setSelected] = useState<ISODate>(today);
  const [note, setNote] = useState<string | null>(null);

  const typeOf = (date: ISODate) => dayType(data.program, data.days[date], date, today);
  const selType = typeOf(selected);
  const selDay = data.days[selected];
  const program = data.program;
  const completion = program ? overallProgress(program, data.days, today, 3650).percent : null;
  const weeks = program ? weeklyTallies(program, data.days, today) : [];
  const recoveryCheck = canScheduleRecovery(program, data.days, selected, today);
  const isFutureOrToday = selected >= today;

  const toggleRecovery = () => {
    const recovery = !selDay?.recovery;
    if (recovery && !recoveryCheck.ok) {
      setNote(t('calendar.recoveryLimit', { count: MAX_RECOVERY_PER_WEEK }));
      return;
    }
    setNote(null);
    void dispatch({ type: 'setRecovery', date: selected, recovery }).catch(() => undefined);
  };

  return (
    <Screen back="back" title={t('calendar.title')}>
      <View style={styles.stats}>
        <StatTile value={String(streak.current)} label={t('calendar.currentStreak')} />
        <StatTile value={String(streak.longest)} label={t('calendar.longestStreak')} />
        <StatTile value={String(streak.primeDays)} label={t('calendar.primeDays')} />
      </View>

      <Card style={styles.calendar}>
        <View style={styles.monthRow}>
          <IconButton icon="chevron-left" variant="plain" label={t('calendar.previous')} onPress={() => setMonth(addMonths(month, -1))} />
          <AppText variant="heading" align="center" style={styles.flex}>
            {formatDate(`${month}-01`, code, { month: 'long', year: 'numeric' })}
          </AppText>
          <IconButton icon="chevron-right" variant="plain" label={t('calendar.next')} onPress={() => setMonth(addMonths(month, 1))} />
        </View>
        <MonthGrid month={month} today={today} selected={selected} typeOf={typeOf} onSelect={setSelected} />
        <View style={styles.legend}>
          {LEGEND.map((type) => (
            <View key={type} style={styles.legendItem}>
              <DayTypeDot type={type} />
              <AppText variant="caption" color="secondary">
                {t(`dayTypes.${type}`)}
              </AppText>
            </View>
          ))}
        </View>
      </Card>

      <View style={styles.section}>
        <SectionHeader title={formatDate(selected, code, { weekday: 'long', day: 'numeric', month: 'long' })} />
        <View style={styles.typeRow}>
          <DayTypeDot type={selType} size={12} />
          <AppText variant="heading">{t(`dayTypes.${selType}`)}</AppText>
        </View>
        {selType === 'prime' || selType === 'active' || selType === 'recovery' || selType === 'missed' ? (
          <AppText variant="caption" color="secondary">
            {t(`dayTypes.${selType}Hint`)}
          </AppText>
        ) : null}
        {selDay && selDay.missions.length > 0 && !(selDay.recovery && selected > today) ? (
          <View style={styles.list}>
            {selDay.missions.map((m) => (
              <MissionCard key={m.id} mission={m} goal={goals.get(m.goalId)} readOnly onToggle={() => undefined} onOpen={() => undefined} />
            ))}
          </View>
        ) : selType !== 'upcoming' && selType !== 'none' && !selDay?.recovery ? (
          <AppText variant="caption" color="secondary">
            {t('calendar.noMissions')}
          </AppText>
        ) : null}
        {selected < today ? (
          <AppText variant="caption" color="secondary">
            {t('calendar.readOnly')}
          </AppText>
        ) : null}
        {isFutureOrToday && selType !== 'none' && !(selected === today && (selType === 'prime' || selType === 'active')) ? (
          <Button
            label={selDay?.recovery ? t('calendar.removeRecovery') : t('calendar.planRecovery')}
            icon="battery-charging"
            variant="secondary"
            size="md"
            accessibilityHint={t('calendar.recoveryLimit', { count: MAX_RECOVERY_PER_WEEK })}
            onPress={toggleRecovery}
          />
        ) : null}
        {note ? <Banner tone="info" message={note} onDismiss={() => setNote(null)} /> : null}
      </View>

      {weeks.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader title={t('calendar.trend')} />
          <Card>
            <WeeklyTrend weeks={weeks} label={(w) => t('journey.week', { week: w })} />
          </Card>
          {completion !== null ? (
            <AppText variant="caption" color="secondary">
              {`${t('calendar.completion')}: ${t('common.percent', { value: completion })}`}
            </AppText>
          ) : null}
        </View>
      ) : null}

      <Card variant="outline" style={styles.rules}>
        <AppText variant="subheading">{t('calendar.rulesTitle')}</AppText>
        <AppText variant="caption" color="secondary">
          {t('calendar.rules')}
        </AppText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stats: { flexDirection: 'row', gap: spacing.xs },
  calendar: { gap: spacing.sm, paddingHorizontal: spacing.xs },
  monthRow: { flexDirection: 'row', alignItems: 'center' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, paddingHorizontal: spacing.sm, paddingBottom: spacing.xs },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  section: { gap: spacing.sm },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  list: { gap: spacing.xs },
  rules: { gap: spacing.xs },
});
