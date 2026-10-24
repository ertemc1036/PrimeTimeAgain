import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useOnboardingDraft } from '@/components/onboarding/OnboardingDraft';
import { OnboardingStep } from '@/components/onboarding/OnboardingStep';
import { TimePicker } from '@/components/plan/TimePicker';

/** Screen 7: realistic daily time. Missions are generated to fit inside it. */
export default function TimeScreen() {
  const { t } = useTranslation();
  const { draft, update } = useOnboardingDraft();
  const [value, setValue] = useState(draft.dailyMinutes);
  return (
    <OnboardingStep
      step={6}
      title={t('onboarding.time.title')}
      subtitle={t('onboarding.time.subtitle')}
      onNext={() => {
        update({ dailyMinutes: value });
        router.push('/create-avatar');
      }}>
      <TimePicker value={value} onChange={setValue} />
    </OnboardingStep>
  );
}
