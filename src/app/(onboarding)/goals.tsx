import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppText, Card, OptionCard, TextField } from '@/components/ui';
import { checkGoalWeight } from '@/domain/goals';
import type { GoalType } from '@/domain/types';
import { useOnboarding } from '@/features/onboarding/draft';
import { OnboardingStep } from '@/features/onboarding/OnboardingStep';
import { formatWeight, parseWeight, weightToInput, weightUnit } from '@/features/units';

const GOALS: { id: GoalType; icon: 'leaf-outline' | 'nutrition-outline' | 'walk-outline' | 'scale-outline' }[] = [
  { id: 'habits', icon: 'leaf-outline' },
  { id: 'nutrition', icon: 'nutrition-outline' },
  { id: 'active', icon: 'walk-outline' },
  { id: 'weight', icon: 'scale-outline' },
];

export default function GoalsStep() {
  const { t } = useTranslation();
  const { draft, update } = useOnboarding();
  const [goals, setGoals] = useState<GoalType[]>(draft.goals);
  const [goalText, setGoalText] = useState(weightToInput(draft.goalWeightKg, draft.units));
  const [submitted, setSubmitted] = useState(false);

  const toggle = (g: GoalType) => setGoals(goals.includes(g) ? goals.filter((x) => x !== g) : [...goals, g]);
  const goalKg = goals.includes('weight') ? parseWeight(goalText, draft.units) : undefined;
  const check = goalKg ? checkGoalWeight(goalKg, draft.weightKg, draft.heightCm) : null;

  let goalMessage: string | undefined;
  if (goalKg === null) goalMessage = t('onboarding.goals.invalid');
  else if (check && !check.ok) {
    goalMessage =
      check.reason === 'underweight'
        ? t('onboarding.goals.underweight', { min: formatWeight(check.minHealthyKg ?? 0, draft.units) })
        : check.reason === 'large_change'
          ? t('onboarding.goals.largeChange')
          : t('onboarding.goals.invalid');
  }
  // Large changes are allowed with guidance; unsafe or invalid goals are not saved.
  const blocking = goalKg === null || (check && !check.ok && check.reason !== 'large_change');

  const onContinue = () => {
    setSubmitted(true);
    if (!goals.length || blocking) return;
    update({ goals, goalWeightKg: goalKg ?? undefined });
    router.push('/activity');
  };

  return (
    <OnboardingStep step={2} title={t('onboarding.goals.title')} subtitle={t('onboarding.goals.subtitle')} onContinue={onContinue}>
      {GOALS.map((g) => (
        <OptionCard key={g.id} title={t(`onboarding.goals.${g.id}`)} icon={g.icon} selected={goals.includes(g.id)} onPress={() => toggle(g.id)} mode="checkbox" />
      ))}
      {goals.includes('weight') ? (
        <TextField
          label={t('onboarding.goals.goalWeight')}
          optional={t('common.optional')}
          hint={t('onboarding.goals.goalWeightHint')}
          value={goalText}
          onChangeText={setGoalText}
          keyboardType="decimal-pad"
          suffix={weightUnit(draft.units)}
          error={blocking ? goalMessage : undefined}
        />
      ) : null}
      {goalMessage && !blocking ? (
        <Card>
          <AppText variant="body">{goalMessage}</AppText>
        </Card>
      ) : null}
      {submitted && !goals.length ? (
        <AppText variant="bodyStrong" accessibilityLiveRegion="polite">
          {t('onboarding.goals.minOne')}
        </AppText>
      ) : null}
    </OnboardingStep>
  );
}
