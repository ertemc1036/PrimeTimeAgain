import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppText, Card, ListRow, Screen, ToggleRow, useToast } from '@/components/ui';
import { useSave } from '@/hooks/useSave';
import { exportData } from '@/services/exportData';
import { deletePrivate } from '@/services/photos';
import { useAppState } from '@/state/AppStateProvider';
import { confirm } from '@/utils/confirm';

export default function PrivacyScreen() {
  const { t } = useTranslation();
  const { data, resetAll } = useAppState();
  const save = useSave();
  const toast = useToast();

  const ask = () => confirm({ title: t('privacy.confirmTitle'), message: t('privacy.confirmBody'), confirmLabel: t('common.delete'), cancelLabel: t('common.cancel'), destructive: true });
  const run = async (fn: () => Promise<unknown>) => {
    if (!(await ask())) return;
    await fn();
    toast(t('privacy.deleted'));
  };
  const deletePhotos = async () => {
    for (const p of data.photos) {
      deletePrivate(p.uri);
      await save({ type: 'deletePhoto', id: p.id });
    }
  };

  return (
    <Screen back="back" title={t('privacy.title')}>
      <AppText variant="body" color="secondary">
        {t('privacy.summary')}
      </AppText>
      <Card variant="outline" padded={false}>
        <ListRow label={t('privacy.export')} hint={t('privacy.exportHint')} icon="download-outline" onPress={() => void exportData(data).then((ok) => !ok && toast(t('privacy.exportFailed'), 'alert-circle-outline'))} divider={false} />
      </Card>
      <Card variant="outline" padded={false}>
        <ToggleRow label={t('privacy.coachConsent')} hint={t('privacy.coachConsentHint')} value={data.coach.consentToContext} onChange={(value) => void save({ type: 'setCoachConsent', value })} divider={false} />
      </Card>
      <Card variant="outline" padded={false}>
        <ListRow label={t('privacy.deleteFood')} icon="trash-outline" onPress={() => void run(() => save({ type: 'deleteAllFood' }))} />
        <ListRow label={t('privacy.deleteActivity')} icon="trash-outline" onPress={() => void run(() => save({ type: 'deleteAllActivity' }))} />
        <ListRow label={t('privacy.deletePhotos')} icon="trash-outline" onPress={() => void run(deletePhotos)} />
        <ListRow label={t('privacy.deleteCoach')} icon="trash-outline" onPress={() => void run(() => save({ type: 'clearCoach' }))} />
        <ListRow
          label={t('privacy.deleteAll')}
          icon="warning-outline"
          onPress={() =>
            void run(async () => {
              data.photos.forEach((p) => deletePrivate(p.uri));
              data.activityLogs.forEach((a) => a.photoUri && deletePrivate(a.photoUri));
              await resetAll();
              router.replace('/');
            })
          }
          divider={false}
        />
      </Card>
    </Screen>
  );
}
