import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Card, EmptyState, Icon, OptionCard, PressableScale, ProBadge, Screen } from '@/components/ui';
import type { ISODate, WorkoutType } from '@/domain/types';
import { DaySwitch } from '@/features/DaySwitch';
import { ACTIVITY_ICONS, activityLabel, activitySummary } from '@/features/labels';
import { useSave } from '@/hooks/useSave';
import { useAppState } from '@/state/AppStateProvider';
import { usePro } from '@/state/ProProvider';
import { colors, radii, spacing } from '@/theme';
import { nowISO } from '@/utils/id';

type Choice = 'gym' | 'outdoor' | 'home' | 'rest';

export default function WorkoutTab() {
  const { t } = useTranslation();
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

  const workoutType = (c: Choice): WorkoutType =>
    c === 'outdoor' ? (plannedActivity?.type === 'outdoor_run' ? 'outdoor_run' : 'outdoor_walk') : (c as WorkoutType);

  return (
    <Screen inTabs title={date === today ? t('workout.title') : t('common.yesterday')} subtitle={t('workout.subtitle')}>
      <DaySwitch today={today} value={date} onChange={setDate} />

      <Card>
        <AppText variant="bodyStrong">{plannedActivity ? t('workout.planned', { summary: activitySummary(t, plannedActivity) }) : t('workout.noPlan')}</AppText>
        {plannedActivity?.notes ? (
          <AppText variant="caption" color="secondary">
            {plannedActivity.notes}
          </AppText>
        ) : null}
      </Card>

      <AppText variant="heading">{t('workout.choose')}</AppText>
      <View style={styles.tiles}>
        {(['gym', 'outdoor', 'home', 'rest'] as const).map((c) => (
          <OptionCard key={c} layout="tile" icon={ACTIVITY_ICONS[c]} title={c === 'rest' ? t('activity.rest') : c === 'home' ? t('activity.home') : t(`activity.${c}`)} selected={selected === c} onPress={() => setChoice(c)} />
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
      <Button label={t('workout.history')} variant="ghost" size="sm" onPress={() => router.push('/history/workouts')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  rest: { gap: spacing.sm },
  savedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  section: { gap: spacing.sm },
  photo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, minHeight: 52, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.card, borderRadius: radii.md, padding: spacing.md },
  flex: { flex: 1, gap: 2 },
});
