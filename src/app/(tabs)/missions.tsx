import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { MissionCard } from '@/components/missions/MissionCard';
import { Toast } from '@/components/missions/Toast';
import { AppText, Banner, Button, Card, EmptyState, Icon, IconButton, ProgressBar, Screen } from '@/components/ui';
import { canScheduleRecovery, MAX_RECOVERY_PER_WEEK } from '@/domain/days';
import { formatDate } from '@/i18n/format';
import { useLanguage } from '@/i18n/useLanguage';
import { useAppState } from '@/state/AppStateProvider';
import { useGoalsById, useProgramInfo, useStreak, useToday } from '@/state/selectors';
import { radii, spacing, status, useColors } from '@/theme';

export default function MissionsScreen() {
  const { t } = useTranslation();
  const { code } = useLanguage();
  const colors = useColors();
  const { data, today, dispatch, saveError, dismissSaveError } = useAppState();
  const info = useProgramInfo();
  const goals = useGoalsById();
  const streak = useStreak();
  const day = useToday();
  const [toast, setToast] = useState<string | null>(null);
  const [recoveryNote, setRecoveryNote] = useState<string | null>(null);
  const wasComplete = useRef(day.type === 'prime');
  const feedbackIndex = useRef(0);

  // Open the end-of-day summary the moment the last mission is completed.
  useEffect(() => {
    if (day.type === 'prime' && !wasComplete.current) router.push('/day-summary');
    wasComplete.current = day.type === 'prime';
  }, [day.type]);

  const feedback = t('missions.feedback', { returnObjects: true }) as unknown as string[];
  const toggle = (missionId: string, done: boolean) => {
    void dispatch({ type: 'setMissionStatus', date: today, missionId, status: done ? 'open' : 'done' }).catch(() => undefined);
    if (!done) setToast(feedback[feedbackIndex.current++ % feedback.length]);
  };

  const setRecovery = (recovery: boolean) => {
    if (recovery) {
      const check = canScheduleRecovery(data.program, data.days, today, today);
      if (!check.ok) {
        setRecoveryNote(t('missions.recovery.limit', { count: MAX_RECOVERY_PER_WEEK }));
        return;
      }
    }
    setRecoveryNote(null);
    void dispatch({ type: 'setRecovery', date: today, recovery }).catch(() => undefined);
  };

  const progress = day.total ? day.doneCount / day.total : 0;

  return (
    <View style={styles.flex}>
      <Screen
        inTabs
        eyebrow={formatDate(today, code, { weekday: 'long', day: 'numeric', month: 'long' })}
        title={t('missions.title')}
        subtitle={t('missions.subtitle')}
        headerRight={
          <View style={styles.headerRight}>
            <IconButton icon="calendar" label={t('missions.calendar')} onPress={() => router.push('/calendar')} />
          </View>
        }>
        {saveError ? <Banner message={t('states.saveError')} onDismiss={dismissSaveError} /> : null}

        {info?.complete ? (
          <Card variant="inverse">
            <AppText variant="heading" color={colors.onAccent}>
              {t('missions.complete.title')}
            </AppText>
            <AppText variant="caption" color={colors.onAccent}>
              {t('missions.complete.body')}
            </AppText>
          </Card>
        ) : day.recovery ? (
          <Animated.View entering={FadeInDown.duration(400)}>
            <Card style={[styles.recovery, { borderColor: status.recovery }]} variant="outline">
              <View style={[styles.recoveryIcon, { backgroundColor: status.recovery }]}>
                <Icon name="battery-charging" size={22} color="#08090B" />
              </View>
              <AppText variant="title">{t('missions.recovery.title')}</AppText>
              <AppText variant="body" color="secondary">
                {t('missions.recovery.body')}
              </AppText>
              <Button label={t('missions.recovery.undo')} variant="secondary" size="md" fullWidth={false} onPress={() => setRecovery(false)} />
            </Card>
          </Animated.View>
        ) : (
          <>
            <View style={styles.progressBlock}>
              <View style={styles.progressRow}>
                <AppText variant="label" style={styles.flex}>
                  {t('missions.progress', { done: day.doneCount, total: day.total, minutes: day.minutesDone })}
                </AppText>
                <View style={[styles.streak, { backgroundColor: colors.accent }]}>
                  <Icon name="zap" size={13} color={colors.onAccent} />
                  <AppText variant="label" color={colors.onAccent}>
                    {String(streak.current)}
                  </AppText>
                </View>
              </View>
              <ProgressBar progress={progress} color={day.type === 'prime' ? status.prime : undefined} height={8} />
            </View>

            {day.missions.length === 0 ? (
              <Card>
                <EmptyState
                  icon="target"
                  title={t('missions.empty.title')}
                  body={t('missions.empty.body')}
                  action={t('missions.empty.action')}
                  onAction={() => router.push('/goals')}
                />
              </Card>
            ) : (
              <View style={styles.list}>
                {day.missions.map((m, i) => (
                  <Animated.View key={m.id} entering={FadeInDown.delay(60 * i).duration(400)} layout={LinearTransition}>
                    <MissionCard
                      mission={m}
                      goal={goals.get(m.goalId)}
                      onToggle={() => toggle(m.id, m.status === 'done')}
                      onOpen={() => router.push({ pathname: '/mission/[id]', params: { id: m.id } })}
                    />
                  </Animated.View>
                ))}
              </View>
            )}

            {day.type === 'prime' ? (
              <Card style={[styles.allDone, { backgroundColor: status.prime }]}>
                <Icon name="award" size={20} color="#08090B" />
                <AppText variant="subheading" color="#08090B" style={styles.flex}>
                  {t('missions.allDone')}
                </AppText>
              </Card>
            ) : null}

            {day.doneCount > 0 ? <Button label={t('missions.finishDay')} onPress={() => router.push('/day-summary')} /> : null}
            <View style={styles.secondary}>
              <Button label={t('missions.add')} icon="plus" variant="secondary" size="md" onPress={() => router.push('/add-mission')} />
              <Button
                label={t('missions.recovery.make')}
                icon="battery-charging"
                variant="ghost"
                size="md"
                accessibilityHint={t('missions.recovery.makeHint', { count: MAX_RECOVERY_PER_WEEK })}
                onPress={() => setRecovery(true)}
              />
              {recoveryNote ? <Banner tone="info" message={recoveryNote} onDismiss={() => setRecoveryNote(null)} /> : null}
            </View>
          </>
        )}
      </Screen>
      {toast ? <Toast message={toast} onHide={() => setToast(null)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerRight: { flexDirection: 'row', gap: spacing.xs },
  progressBlock: { gap: spacing.xs },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  list: { gap: spacing.xs },
  allDone: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  secondary: { gap: spacing.xs },
  recovery: { gap: spacing.sm, borderWidth: 2, padding: spacing.lg },
  recoveryIcon: { width: 48, height: 48, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
});
