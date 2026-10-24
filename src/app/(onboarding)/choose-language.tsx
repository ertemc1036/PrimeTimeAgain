import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { OnboardingStep } from '@/components/onboarding/OnboardingStep';
import { LanguageList } from '@/components/settings/LanguageList';
import { useChangeLanguage } from '@/components/settings/useChangeLanguage';
import { useLanguage } from '@/i18n/useLanguage';

export default function ChooseLanguageScreen() {
  const { t } = useTranslation();
  const { code } = useLanguage();
  const changeLanguage = useChangeLanguage();

  return (
    <OnboardingStep
      step={1}
      title={t('onboarding.language.title')}
      subtitle={t('onboarding.language.subtitle')}
      onNext={() => router.push('/about')}>
      <LanguageList value={code} onChange={changeLanguage} />
    </OnboardingStep>
  );
}
