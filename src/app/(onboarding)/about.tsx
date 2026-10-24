import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useOnboardingDraft } from '@/components/onboarding/OnboardingDraft';
import { OnboardingStep } from '@/components/onboarding/OnboardingStep';
import { TextField } from '@/components/ui';

export default function AboutScreen() {
  const { t } = useTranslation();
  const { draft, update } = useOnboardingDraft();
  const next = () => router.push('/focus');

  return (
    <OnboardingStep step={2} title={t('onboarding.about.title')} subtitle={t('onboarding.about.subtitle')} onNext={next}>
      <TextField
        label={t('onboarding.about.label')}
        placeholder={t('onboarding.about.placeholder')}
        hint={t('onboarding.about.hint')}
        value={draft.name}
        onChangeText={(name) => update({ name })}
        autoCapitalize="words"
        autoComplete="given-name"
        textContentType="givenName"
        returnKeyType="next"
        maxLength={40}
        onSubmitEditing={next}
      />
    </OnboardingStep>
  );
}
