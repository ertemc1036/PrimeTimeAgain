import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Card, EmptyState, Icon, OptionCard, PressableScale, ProBadge, Screen } from '@/components/ui';
import { addDays } from '@/domain/dates';
import { gymDay, trainingWeek } from '@/domain/daySummary';
import type { ISODate, WorkoutType } from '@/domain/types';
import { DaySwitch } from '@/features/DaySwitch';
import { PrimeHero } from '@/features/prime/character/PrimeHero';
import { ACTIVITY_ICONS, activityLabel, activitySummary } from '@/features/labels';
import { useSave } from '@/hooks/useSave';
import { useAppState } from '@/state/AppStateProvider';
import { usePro } from '@/state/ProProvider';
import { formatDate } from '@/i18n/format';
import { useLocale } from '@/i18n/useLanguage';
import { colors, radii, spacing } from '@/theme';
import { nowISO } from '@/utils/id';

type Choice = 'gym' | 'outdoor' | 'home' | 'rest';

/** Gym: today's planned and logged training, the last 7 days and tomorrow's plan. */
export default function GymTab() {
  const { t } = useTranslation();
  const locale = useLocale();
  const { data, today } = useAppState();
  const { canOpenPro } = usePro();
  const save = useSave();
  const [date, setDate] = useState<ISODate>(today);
  const plannedActivity = data.plans[date]?.activity ?? null;
  const plannedChoice: Choice | null = plannedActivity ? (plannedActivity.type.startsWith('outdoor') ? 'outdoor' : (plannedActivity.type as Choice)) : null;
  const [choice, setChoice] = useState<Choice | null>(null);
  const selected = choice ?? plannedChoice;
  const logs = data.activityLogs.filter((a) => a.date === date).sort((a, b) => (a.startTime < b.startTime ? -1 : 1));
  const rest = data.recoveryLogs[date];
  const day = gymDay(data, date);
  const week = trainingWeek(data, today);
  const maxMin = Math.max(30, ...week.perDay.map((d) => d.minutes));
  const tomorrowPlan = data.plans[addDays(today, 1)]?.activity ?? null;

  const workoutType = (c: Choice): WorkoutType => (c === 'outdoor' ? (plannedActivity?.type === 'outdoor_run' ? 'outdoor_run' : 'outdoor_walk') : (c as WorkoutType));

  return (
    <Screen inTabs title={date === today ? t('gym.title') : t('common.yesterday')} subtitle={t('gym.subtitle')}>
      <DaySwitch today={today} value={date} onChange={setDate} />

      {/* Did I train today, what, and what was planned – Prime trains, celebrates or rests with you */}
      <PrimeHero
        variant={day.rest ? 'recovery' : day.sessions > 0 ? 'success' : 'gym'}
        eyebrow={date === today ? t('gym.today') : t('common.yesterday')}
        title={day.sessions ? t('gym.trained') : day.rest ? t('activity.rest') : t('gym.notYet')}
        subtitle={
          day.sessions
            ? [day.types.map((ty) => activityLabel(t, ty)).join(', '), t('common.min', { count: day.minutes })].join(' · ')
            : plannedActivity
              ? t('workout.planned', { summary: activitySummary(t, plannedActivity) })
              : day.rest
                ? t('workout.restBody')
                : t('workout.noPlan')
        }
      />
      {plannedActivity?.notes ? (
        <AppText variant="caption" color="secondary">
          {plannedActivity.notes}
        </AppText>
      ) : null}

      <AppText variant="heading">{t('workout.choose')}</AppText>
      <View style={styles.tiles}>
        {(['gym', 'outdoor', 'home', 'rest'] as const).map((c) => (
          <OptionCard
            key={c}
            layout="tile"
            icon={ACTIVITY_ICONS[c]}
            title={c === 'rest' ? t('activity.rest') : c === 'home' ? t('activity.home') : t(`activity.${c}`)}
            selected={selected === c}
            onPress={() => setChoice(c)}
          />
        ))}
      </View>

      {selected === 'rest' ? (
        <Card variant="outline" style={styles.rest}>
          <Icon name="moon-outline" size={28} />
          <AppText variant="heading">{t('workout.restTitle')}</AppText>
          <AppText variant="body">{t('workout.restBody')}</AppText>
          <AppText variant="body" color="secondary">
            {t('workout.restSupport')}
          </AppText>
          {rest ? (
            <>
              <View style={styles.savedRow}>
                <Icon name="checkmark-circle" size={20} />
                <AppText variant="bodyStrong">{t('workout.restSaved')}</AppText>
              </View>
              <Button label={t('workout.undoRest')} variant="ghost" size="sm" onPress={() => void save({ type: 'removeRestDay', date })} />
            </>
          ) : (
            <Button label={t('workout.saveRest')} onPress={() => void save({ type: 'saveRestDay', date, at: nowISO() }, t('workout.restDone'))} />
          )}
        </Card>
      ) : selected ? (
        <View style={styles.section}>
          <Button label={t('workout.logWorkout')} icon="create-outline" onPress={() => router.push({ pathname: '/workout-log', params: { type: workoutType(selected), date } })} />
          <PressableScale
            style={styles.photo}
            accessibilityRole="button"
            accessibilityLabel={`${t('workout.photo')}, ${t('common.pro')}`}
            onPress={() => router.push(canOpenPro ? { pathname: '/workout-photo', params: { type: workoutType(selected), date } } : '/pro')}>
            <Icon name="camera-outline" size={20} />
            <AppText variant="button">{t('workout.photo')}</AppText>
            <ProBadge label={t('common.pro')} />
          </PressableScale>
        </View>
      ) : null}

      <View style={styles.section}>
        <AppText variant="heading">{t('workout.logged')}</AppText>
        {logs.length === 0 && !rest ? (
          <Card>
            <EmptyState icon="barbell-outline" title={t('workout.emptyTitle')} body={t('workout.emptyBody')} />
          </Card>
        ) : null}
        {rest ? (
          <View style={styles.row}>
            <Icon name="moon-outline" size={20} />
            <AppText variant="bodyStrong" style={styles.flex}>
              {t('activity.rest')}
            </AppText>
            <Icon name="checkmark-circle" size={20} />
          </View>
        ) : null}
        {logs.map((l) => (
          <PressableScale key={l.id} style={styles.row} accessibilityRole="button" onPress={() => router.push({ pathname: '/workout-log', params: { id: l.id } })}>
            <Icon name={ACTIVITY_ICONS[l.type]} size={20} />
            <View style={styles.flex}>
              <AppText variant="bodyStrong">
                {activityLabel(t, l.type)} · {l.startTime} · {t('common.min', { count: l.durationMin })}
              </AppText>
              <AppText variant="caption" color="secondary">
                {l.description} · {l.entryMethod === 'photo' ? t('workout.withPhoto') : t('workout.selfReported')}
              </AppText>
            </View>
            <Icon name="chevron-forward" size={18} color={colors.textSecondary} />
          </PressableScale>
        ))}
      </View>
      {/* Training overview: last 7 days */}
      <Card variant="elevated" style={styles.section}>
        <AppText variant="subheading">{t('gym.week.title')}</AppText>
        {week.sessions ? (
          <>
            <AppText variant="caption" color="secondary">
              {[t('gym.week.days', { count: week.activeDays }), t('gym.week.sessions', { count: week.sessions }), t('common.min', { count: week.minutes })].join(' · ')}
            </AppText>
            <View style={styles.bars} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              {week.perDay.map((d) => (
                <View key={d.date} style={styles.barCol}>
                  <View style={styles.barTrack}>
                    {d.minutes ? (
                      <View style={[styles.bar, { height: `${Math.max(8, Math.round((d.minutes / maxMin) * 100))}%` }]} />
                    ) : d.rest ? (
                      <Icon name="moon-outline" size={12} color={colors.textSecondary} />
                    ) : null}
                  </View>
                  <AppText variant="caption" color={d.date === today ? colors.text : 'secondary'}>
                    {formatDate(d.date, locale, { weekday: 'narrow' })}
                  </AppText>
                </View>
              ))}
            </View>
            {week.byType.map((b) => (
              <View key={b.type} style={styles.typeRow}>
                <Icon name={ACTIVITY_ICONS[b.type]} size={18} />
                <AppText variant="body" style={styles.flex}>
                  {activityLabel(t, b.type)}
                </AppText>
                <AppText variant="caption" color="secondary">
                  {t('gym.week.sessions', { count: b.sessions })} · {t('common.min', { count: b.minutes })}
                </AppText>
              </View>
            ))}
          </>
        ) : (
          <AppText variant="caption" color="secondary">
            {t('gym.week.empty')}
          </AppText>
        )}
      </Card>

      {/* Tomorrow's training (planned in the Plan Tomorrow routine) */}
      <PressableScale style={styles.tomorrow} accessibilityRole="button" onPress={() => router.push('/plan')}>
        <Icon name="calendar-outline" size={20} color={colors.text} />
        <View style={styles.flex}>
          <AppText variant="label" color="secondary">
            {t('gym.tomorrow.title')}
          </AppText>
          <AppText variant="bodyStrong">{tomorrowPlan ? activitySummary(t, tomorrowPlan) : t('gym.tomorrow.none')}</AppText>
        </View>
        <AppText variant="label" color={colors.text}>
          {t('gym.tomorrow.plan')}
        </AppText>
      </PressableScale>

      <Button label={t('workout.history')} variant="ghost" size="sm" onPress={() => router.push('/history/workouts')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  rest: { gap: spacing.sm },
  savedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  section: { gap: spacing.sm },
  photo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 52,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.card, borderRadius: radii.md, padding: spacing.md },
  flex: { flex: 1, gap: 2 },
  bars: { flexDirection: 'row', gap: spacing.xs, height: 96, marginTop: spacing.xs },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  barTrack: { flex: 1, width: '100%', maxWidth: 28, borderRadius: 8, backgroundColor: colors.card, justifyContent: 'flex-end', alignItems: 'center', overflow: 'hidden', paddingBottom: 0 },
  bar: { width: '100%', borderRadius: 8, backgroundColor: colors.accent },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 4 },
  tomorrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
});
