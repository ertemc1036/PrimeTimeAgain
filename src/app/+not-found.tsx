import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button, EmptyState, Screen } from '@/components/ui';

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <Screen>
      <EmptyState icon="compass-outline" title={t('notFound.title')} />
      <Button label={t('notFound.action')} onPress={() => router.replace('/')} />
    </Screen>
  );
}
