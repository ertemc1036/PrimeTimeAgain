import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { GoalPicker } from '@/components/onboarding/GoalPicker';
import { AppText, Banner, Button, Screen } from '@/components/ui';
import { MAX_ACTIVE_GOALS } from '@/domain/catalog';
import { useAppState } from '@/state/AppStateProvider';
import { colors } from '@/theme';

export default function GoalsEditorScreen() {
  const { t } = useTranslation();
  const { data, updateGoals } = useAppState();
  const [goalIds, setGoalIds] = useState(data.goalIds);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const count = goalIds.length;

  const save = async () => {
    setSaving(true);
    setFailed(false);
    try {
      await updateGoals(goalIds);
      router.back();
    } catch {
      setFailed(true);
      setSaving(false);
    }
  };

  return (
    <Screen
      back="back"
      title={t('goalsEditor.title')}
      subtitle={t('goalsEditor.subtitle')}
      footer={
        <>
          <AppText variant="caption" color={colors.textSecondary} align="center" accessibilityLiveRegion="polite">
            {count === 0
              ? t('onboarding.goals.minOne')
              : count >= MAX_ACTIVE_GOALS
                ? t('onboarding.goals.maxReached')
                : t('onboarding.goals.selected', { count })}
          </AppText>
          <Button label={t('goalsEditor.save')} onPress={save} loading={saving} disabled={count === 0} />
        </>
      }>
      {failed ? <Banner message={t('states.saveError')} onDismiss={() => setFailed(false)} /> : null}
      <GoalPicker pillars={data.profile?.focusPillars ?? []} value={goalIds} onChange={setGoalIds} />
    </Screen>
  );
}
