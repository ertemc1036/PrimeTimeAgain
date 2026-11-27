import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppText, Card, ListRow, Screen, ToggleRow, useToast } from '@/components/ui';
import { useSave } from '@/hooks/useSave';
import { exportCloudData } from '@/services/auth';
import { exportData, shareJson } from '@/services/exportData';
import { useAuth } from '@/state/AuthProvider';
import { deletePrivate } from '@/services/photos';
import { useAppState } from '@/state/AppStateProvider';
import { confirm } from '@/utils/confirm';
import { nowISO } from '@/utils/id';
import { hasHealthConsent } from '@/domain/consent';
import { formatDate } from '@/i18n/format';
import { useLocale } from '@/i18n/useLanguage';

export default function PrivacyScreen() {
  const { t } = useTranslation();
  const { data, resetAll } = useAppState();
  const save = useSave();
  const toast = useToast();
  const auth = useAuth();
  const locale = useLocale();
  // Signed in: export the authoritative cloud copy (includes everything synced from all devices).
  const doExport = async () => {
    let ok: boolean;
    if (auth.status === 'signedIn') {
      const r = await exportCloudData();
      ok = r.ok ? await shareJson(r.value) : await exportData(data);
    } else ok = await exportData(data);
    if (!ok) toast(t('privacy.exportFailed'), 'alert-circle-outline');
  };

  const withdrawHealth = async () => {
    if (!(await confirm({ title: t('consent.withdrawTitle'), message: t('consent.withdrawBody'), confirmLabel: t('consent.withdrawConfirm'), cancelLabel: t('common.cancel'), destructive: true }))) return;
    const r = await save({ type: 'setHealthConsent', granted: false, at: nowISO() });
    if (r.ok) toast(t('consent.withdrawn'), 'shield-checkmark-outline');
  };

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
        <ListRow label={t('privacy.export')} hint={t('privacy.exportHint')} icon="download-outline" onPress={() => void doExport()} divider={false} />
      </Card>
      <Card variant="outline" padded={false}>
        <ToggleRow
          label={t('consent.toggle')}
          hint={
            hasHealthConsent(data.profile)
              ? `${t('consent.toggleHint')} ${t('consent.grantedOn', { date: formatDate(data.profile!.healthConsent!.at.slice(0, 10), locale, { day: 'numeric', month: 'long', year: 'numeric' }) })}`
              : `${t('consent.toggleHint')} ${t('consent.notGranted')}`
          }
          value={hasHealthConsent(data.profile)}
          onChange={(value) => void (value ? router.push('/settings/health-consent') : withdrawHealth())}
          divider={false}
        />
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
