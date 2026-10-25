import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button, EmptyState, Screen } from '@/components/ui';

export default function AdultsOnly() {
  const { t } = useTranslation();
  return (
    <Screen back="back" footer={<Button label={t('onboarding.adultsOnly.back')} onPress={() => router.back()} variant="secondary" />}>
      <EmptyState icon="information-circle-outline" title={t('onboarding.adultsOnly.title')} body={t('onboarding.adultsOnly.body')} />
    </Screen>
  );
}
