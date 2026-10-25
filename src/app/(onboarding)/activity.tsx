import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppText, OptionCard, type IconName } from '@/components/ui';
import type { ActivityPreference } from '@/domain/types';
import { useOnboarding } from '@/features/onboarding/draft';
import { OnboardingStep } from '@/features/onboarding/OnboardingStep';

const OPTIONS: { id: ActivityPreference; icon: IconName }[] = [
  { id: 'gym', icon: 'barbell-outline' },
  { id: 'walking', icon: 'walk-outline' },
  { id: 'running', icon: 'speedometer-outline' },
  { id: 'home', icon: 'home-outline' },
  { id: 'combination', icon: 'shuffle-outline' },
];

export default function ActivityStep() {
  const { t } = useTranslation();
  const { draft, update } = useOnboarding();
  const [prefs, setPrefs] = useState<ActivityPreference[]>(draft.activityPrefs);
  const [submitted, setSubmitted] = useState(false);
  const toggle = (p: ActivityPreference) => setPrefs(prefs.includes(p) ? prefs.filter((x) => x !== p) : [...prefs, p]);
  return (
    <OnboardingStep
      step={3}
      title={t('onboarding.activity.title')}
      subtitle={t('onboarding.activity.subtitle')}
      onContinue={() => {
        setSubmitted(true);
        if (!prefs.length) return;
        update({ activityPrefs: prefs });
        router.push('/nutrition');
      }}>
      {OPTIONS.map((o) => (
        <OptionCard key={o.id} title={t(`onboarding.activity.${o.id}`)} icon={o.icon} selected={prefs.includes(o.id)} onPress={() => toggle(o.id)} mode="checkbox" />
      ))}
      {submitted && !prefs.length ? <AppText variant="bodyStrong">{t('onboarding.activity.minOne')}</AppText> : null}
    </OnboardingStep>
  );
}
