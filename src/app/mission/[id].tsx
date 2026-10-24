import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Banner, Button, Card, EmptyState, Glyph, Screen, Stepper } from '@/components/ui';
import { addDays } from '@/domain/dates';
import { missionFromAction, replacementFor } from '@/domain/missions';
import { goalTitle, missionTitle } from '@/i18n/content';
import { useAppState } from '@/state/AppStateProvider';
import { missionGlyph, useGoalsById } from '@/state/selectors';
import { radii, spacing, useColors } from '@/theme';

export default function MissionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const colors = useColors();
  const { data, today, dispatch } = useAppState();
  const goals = useGoalsById();
  const [note, setNote] = useState<string | null>(null);
  const mission = data.days[today]?.missions.find((m) => m.id === id);

  if (!mission) {
    return (
      <Screen back="close">
        <EmptyState icon="slash" title={t('missions.detail.readOnly')} />
      </Screen>
    );
  }
  const goal = goals.get(mission.goalId);
  const done = mission.status === 'done';
  const open = mission.status === 'open';
  const run = (p: Promise<void>) => p.catch(() => setNote(t('states.saveError')));

  const replace = () => {
    const day = data.days[today];
    const action = goal && day ? replacementFor(mission, goal, day) : null;
    if (!goal || !action) {
      setNote(t('missions.detail.noReplacement'));
      return;
    }
    const next = { ...missionFromAction(today, goal, action, day.missions.length + 1), carriedFrom: mission.carriedFrom };
    void run(dispatch({ type: 'replaceMission', date: today, missionId: mission.id, next }));
    router.setParams({ id: next.id });
  };

  return (
    <Screen
      back="close"
      eyebrow={t('missions.details')}
      title={missionTitle(t, mission, goal)}
      footer={
        <Button
          label={done ? t('missions.markOpen') : t('missions.markDone')}
          variant={done ? 'secondary' : 'primary'}
          icon={done ? 'rotate-ccw' : 'check'}
          disabled={!open && !done}
          onPress={() => {
            void run(dispatch({ type: 'setMissionStatus', date: today, missionId: mission.id, status: done ? 'open' : 'done' }));
            if (!done) router.back();
          }}
        />
      }>
      {note ? <Banner tone="info" message={note} onDismiss={() => setNote(null)} /> : null}
      <Card style={styles.facts}>
        <View style={[styles.glyph, { backgroundColor: colors.background }]}>
          <Glyph name={missionGlyph(mission, goal)} size={24} />
        </View>
        <Fact label={t('missions.detail.goal')} value={goal ? goalTitle(t, goal) : '–'} />
        <Fact label={t('missions.detail.duration')} value={t('common.minutes', { count: mission.minutes })} />
        <Fact label={t('missions.detail.difficulty')} value={t(`difficulty.${mission.difficulty}`)} />
        <Fact
          label={t('missions.detail.status')}
          value={done ? t('missions.done') : mission.status === 'skipped' ? t('missions.skipped') : mission.status === 'postponed' ? t('missions.postponed') : t('missions.todo')}
        />
      </Card>

      {open ? (
        <>
          <AppText variant="overline" color="secondary">
            {t('missions.detail.editDuration')}
          </AppText>
          <Stepper
            label={t('missions.detail.editDuration')}
            value={mission.minutes}
            display={t('common.minutes', { count: mission.minutes })}
            onChange={(minutes) => void run(dispatch({ type: 'editMission', date: today, missionId: mission.id, patch: { minutes } }))}
            step={5}
            min={5}
            max={180}
            decreaseLabel={t('onboarding.time.decrease')}
            increaseLabel={t('onboarding.time.increase')}
          />
          <View style={styles.actions}>
            <Button label={t('missions.detail.replace')} icon="shuffle" variant="secondary" size="md" onPress={replace} />
            <Button
              label={t('missions.detail.postpone')}
              icon="corner-up-right"
              variant="secondary"
              size="md"
              onPress={() => {
                void run(dispatch({ type: 'postponeMission', date: today, missionId: mission.id, toDate: addDays(today, 1) }));
                router.back();
              }}
            />
            <Button
              label={t('missions.detail.skip')}
              icon="skip-forward"
              variant="ghost"
              size="md"
              onPress={() => {
                void run(dispatch({ type: 'setMissionStatus', date: today, missionId: mission.id, status: 'skipped' }));
                router.back();
              }}
            />
          </View>
        </>
      ) : mission.status === 'skipped' ? (
        <Button
          label={t('missions.detail.reopen')}
          icon="rotate-ccw"
          variant="secondary"
          size="md"
          onPress={() => void run(dispatch({ type: 'setMissionStatus', date: today, missionId: mission.id, status: 'open' }))}
        />
      ) : null}
    </Screen>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <AppText variant="caption" color="secondary" style={styles.factLabel}>
        {label}
      </AppText>
      <AppText variant="bodyStrong" style={styles.factValue}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  facts: { gap: spacing.sm },
  glyph: { width: 52, height: 52, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  fact: { flexDirection: 'row', gap: spacing.sm, alignItems: 'baseline' },
  factLabel: { width: 110 },
  factValue: { flex: 1 },
  actions: { gap: spacing.xs },
});
