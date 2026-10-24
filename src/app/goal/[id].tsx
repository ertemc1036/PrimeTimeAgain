import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { WeeklyTrend } from '@/components/calendar/WeeklyTrend';
import { AppText, Banner, Button, Card, EmptyState, Glyph, ProgressRing, Screen, SectionHeader, Stepper, TextField } from '@/components/ui';
import { getActionTemplate, MAX_ACTIONS_PER_GOAL } from '@/domain/catalog';
import { goalHistory, goalProgress, totals, weeklyTallies } from '@/domain/progress';
import { newId } from '@/domain/plan';
import { formatDate } from '@/i18n/format';
import { actionTitle, goalOutcome, goalTitle, missionTitle } from '@/i18n/content';
import { useLanguage } from '@/i18n/useLanguage';
import { useAppState } from '@/state/AppStateProvider';
import { goalGlyph } from '@/state/selectors';
import { spacing, useColors } from '@/theme';

export default function GoalScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { code } = useLanguage();
  const colors = useColors();
  const { data, today, dispatch } = useAppState();
  const goal = data.goals.find((g) => g.id === id);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newMinutes, setNewMinutes] = useState(15);
  const [note, setNote] = useState<string | null>(null);

  if (!goal || !data.program) {
    return (
      <Screen back="back">
        <EmptyState icon="target" title={t('notFound.title')} />
      </Screen>
    );
  }
  const program = data.program;
  const progress = goalProgress(goal, program, data.days, today);
  const tot = totals(data.days, goal.id);
  const weeks = weeklyTallies(program, data.days, today, goal.id);
  const history = goalHistory(data.days, goal.id, 8);
  const save = (next: typeof goal) => dispatch({ type: 'upsertGoal', goal: next }).catch(() => setNote(t('states.saveError')));

  const toggleAction = (actionId: string, active: boolean) => {
    if (!active && goal.actions.filter((a) => a.active).length <= 1) {
      setNote(t('goal.minOneAction'));
      return;
    }
    void save({ ...goal, actions: goal.actions.map((a) => (a.id === actionId ? { ...a, active } : a)) });
  };

  const addAction = () => {
    if (!newTitle.trim()) return;
    void save({ ...goal, actions: [...goal.actions, { id: newId('a'), title: newTitle.trim(), minutes: newMinutes, difficulty: 2, active: true }] });
    setNewTitle('');
    setAdding(false);
  };

  return (
    <Screen
      back="back"
      eyebrow={t(`areas.${goal.area}`)}
      title={goalTitle(t, goal)}
      headerRight={<Button label={t('common.edit')} variant="ghost" size="md" fullWidth={false} onPress={() => router.push({ pathname: '/goal-edit/[id]', params: { id: goal.id } })} />}>
      {note ? <Banner tone="info" message={note} onDismiss={() => setNote(null)} /> : null}

      <Card variant="inverse" style={styles.hero}>
        <ProgressRing progress={(progress.percent ?? 0) / 100} size={96} stroke={6} color={colors.onAccent} track="rgba(127,127,127,0.35)">
          <Glyph name={goalGlyph(goal)} size={20} color={colors.onAccent} />
          <AppText variant="subheading" color={colors.onAccent}>
            {progress.percent === null ? '–' : t('common.percent', { value: progress.percent })}
          </AppText>
        </ProgressRing>
        <View style={styles.flex}>
          <AppText variant="overline" color={colors.onAccent} style={styles.dim}>
            {t('goal.progress')}
          </AppText>
          <AppText variant="heading" color={colors.onAccent}>
            {t('area.missionsDone', { count: tot.missionsDone })}
          </AppText>
          <AppText variant="caption" color={colors.onAccent} style={styles.dim}>
            {t('goal.invested', { minutes: tot.minutesInvested })}
          </AppText>
        </View>
      </Card>

      <Card style={styles.objective}>
        <AppText variant="overline" color="secondary">
          {t('goal.startingPoint')}
        </AppText>
        <AppText variant="body" color={goal.startingPoint ? undefined : 'secondary'}>
          {goal.startingPoint || t('goal.notSet')}
        </AppText>
        <AppText variant="overline" color="secondary" style={styles.mt}>
          {t('goal.outcome')}
        </AppText>
        <AppText variant="bodyStrong">{goalOutcome(t, goal)}</AppText>
      </Card>

      <SectionHeader title={t('goal.dailyActions')} />
      <AppText variant="caption" color="secondary">
        {t('goal.actionsHint')}
      </AppText>
      <Card padded={false}>
        {goal.actions.map((a, i) => {
          const title = actionTitle(t, a, goal);
          return (
            <View key={a.id} style={[styles.action, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
              <Glyph name={getActionTemplate(a.templateId)?.icon ?? 'create'} size={18} color={a.active ? colors.text : colors.textSecondary} />
              <View style={styles.flex}>
                <AppText variant="bodyStrong" color={a.active ? undefined : 'secondary'}>
                  {title}
                </AppText>
                <AppText variant="caption" color="secondary">
                  {`${t('common.minutes', { count: a.minutes })} · ${t(`difficulty.${a.difficulty}`)}`}
                </AppText>
              </View>
              <Switch
                value={a.active}
                onValueChange={(v) => toggleAction(a.id, v)}
                trackColor={{ true: colors.accent, false: colors.border }}
                thumbColor={colors.background}
                ios_backgroundColor={colors.border}
                accessibilityLabel={a.active ? t('goal.actionActive', { action: title }) : t('goal.actionInactive', { action: title })}
              />
            </View>
          );
        })}
      </Card>
      {adding ? (
        <Card variant="outline" style={styles.addForm}>
          <TextField label={t('goal.actionTitle')} placeholder={t('goal.actionPlaceholder')} value={newTitle} onChangeText={setNewTitle} maxLength={80} autoFocus />
          <Stepper
            label={t('goal.actionMinutes')}
            value={newMinutes}
            display={t('common.minutes', { count: newMinutes })}
            onChange={setNewMinutes}
            step={5}
            min={5}
            max={180}
            decreaseLabel={t('onboarding.time.decrease')}
            increaseLabel={t('onboarding.time.increase')}
          />
          <View style={styles.row}>
            <Button label={t('common.cancel')} variant="ghost" size="md" fullWidth={false} onPress={() => setAdding(false)} />
            <Button label={t('common.add')} size="md" fullWidth={false} disabled={!newTitle.trim()} onPress={addAction} />
          </View>
        </Card>
      ) : goal.actions.length < MAX_ACTIONS_PER_GOAL ? (
        <Button label={t('goal.addAction')} icon="plus" variant="secondary" size="md" onPress={() => setAdding(true)} />
      ) : null}

      {weeks.length > 0 ? (
        <>
          <SectionHeader title={t('goal.weekly')} />
          <Card>
            <WeeklyTrend weeks={weeks} label={(w) => t('goal.weekLabel', { week: w })} />
          </Card>
        </>
      ) : null}

      <SectionHeader title={t('goal.history')} />
      {history.length === 0 ? (
        <AppText variant="caption" color="secondary">
          {t('goal.noHistory')}
        </AppText>
      ) : (
        <Card padded={false}>
          {history.map(({ date, mission }, i) => (
            <View key={mission.id} style={[styles.action, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
              <AppText variant="label" color="secondary" style={styles.date}>
                {formatDate(date, code, { day: 'numeric', month: 'short' })}
              </AppText>
              <AppText variant="body" style={styles.flex}>
                {missionTitle(t, mission, goal)}
              </AppText>
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, padding: spacing.lg },
  dim: { opacity: 0.7 },
  objective: { gap: spacing.xxs },
  mt: { marginTop: spacing.sm },
  action: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, minHeight: 60 },
  addForm: { gap: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.xs },
  date: { width: 56 },
});
