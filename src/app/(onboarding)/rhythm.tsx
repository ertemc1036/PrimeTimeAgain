import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useOnboardingDraft } from '@/components/onboarding/OnboardingDraft';
import { OnboardingStep } from '@/components/onboarding/OnboardingStep';
import { SelectCard } from '@/components/ui';
import { MINUTE_OPTIONS } from '@/components/onboarding/minuteOptions';

export default function RhythmScreen() {
  const { t } = useTranslation();
  const { draft, update } = useOnboardingDraft();

  return (
    <OnboardingStep
      step={4}
      title={t('onboarding.rhythm.title')}
      subtitle={t('onboarding.rhythm.subtitle')}
      onNext={() => router.push('/choose-goals')}>
      {MINUTE_OPTIONS.map((o) => (
        <SelectCard
          key={o.value}
          mode="radio"
          icon={o.icon}
          title={t(`onboarding.rhythm.${o.key}.title`)}
          description={t(`onboarding.rhythm.${o.key}.description`)}
          selected={draft.dailyMinutes === o.value}
          onPress={() => update({ dailyMinutes: o.value, goalIds: [] })}
        />
      ))}
    </OnboardingStep>
  );
}
