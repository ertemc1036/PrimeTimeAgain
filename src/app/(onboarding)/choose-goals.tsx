import { router } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { GoalPicker } from '@/components/onboarding/GoalPicker';
import { useOnboardingDraft } from '@/components/onboarding/OnboardingDraft';
import { OnboardingStep } from '@/components/onboarding/OnboardingStep';
import { MAX_ACTIVE_GOALS, suggestedGoals } from '@/domain/catalog';

export default function ChooseGoalsScreen() {
  const { t } = useTranslation();
  const { draft, update } = useOnboardingDraft();

  // Pre-select a gentle starting set based on focus and available time.
  useEffect(() => {
    if (draft.goalIds.length === 0) update({ goalIds: suggestedGoals(draft.pillars, draft.dailyMinutes) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const count = draft.goalIds.length;
  const note =
    count === 0
      ? t('onboarding.goals.minOne')
      : count >= MAX_ACTIVE_GOALS
        ? t('onboarding.goals.maxReached')
        : t('onboarding.goals.selected', { count });

  return (
    <OnboardingStep
      step={5}
      title={t('onboarding.goals.title')}
      subtitle={t('onboarding.goals.subtitle')}
      nextDisabled={count === 0}
      footerNote={note}
      onNext={() => router.push('/ready')}>
      <GoalPicker pillars={draft.pillars} value={draft.goalIds} onChange={(goalIds) => update({ goalIds })} />
    </OnboardingStep>
  );
}
