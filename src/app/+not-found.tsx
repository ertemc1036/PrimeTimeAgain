import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { EmptyState, Screen } from '@/components/ui';

export default function NotFoundScreen() {
  const { t } = useTranslation();
  return (
    <Screen>
      <EmptyState icon="compass" title={t('notFound.title')} action={t('notFound.action')} onAction={() => router.replace('/')} />
    </Screen>
  );
}
