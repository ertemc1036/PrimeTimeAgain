import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppText, Card } from '@/components/ui';
import type { FoodPreferences } from '@/domain/types';
import { useOnboarding } from '@/features/onboarding/draft';
import { OnboardingStep } from '@/features/onboarding/OnboardingStep';
import { useFoodSuggestions } from '@/features/foodSuggestions';
import { TagInput } from '@/features/TagInput';

export default function NutritionStep() {
  const { t } = useTranslation();
  const FOOD_SUGGESTIONS = useFoodSuggestions();
  const { draft, update } = useOnboarding();
  const [food, setFood] = useState<FoodPreferences>(draft.food);
  const set = (k: keyof FoodPreferences) => (v: string[]) => setFood({ ...food, [k]: v });
  return (
    <OnboardingStep
      step={4}
      title={t('onboarding.nutrition.title')}
      subtitle={t('onboarding.nutrition.subtitle')}
      onContinue={() => {
        update({ food });
        router.push('/planning-time');
      }}>
      <TagInput label={t('onboarding.nutrition.preferred')} values={food.preferred} onChange={set('preferred')} suggestions={FOOD_SUGGESTIONS.preferred} />
      <TagInput label={t('onboarding.nutrition.restrictions')} values={food.restrictions} onChange={set('restrictions')} suggestions={FOOD_SUGGESTIONS.restrictions} />
      <TagInput label={t('onboarding.nutrition.allergies')} values={food.allergies} onChange={set('allergies')} suggestions={FOOD_SUGGESTIONS.allergies} />
      <Card>
        <AppText variant="caption">{t('onboarding.nutrition.allergyNote')}</AppText>
      </Card>
      <TagInput label={t('onboarding.nutrition.dislikes')} values={food.dislikes} onChange={set('dislikes')} />
    </OnboardingStep>
  );
}
