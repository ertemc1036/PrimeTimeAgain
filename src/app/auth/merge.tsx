import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button, OptionCard, Screen } from '@/components/ui';
import { useSync } from '@/state/SyncProvider';
import { confirm } from '@/utils/confirm';

/** First sign-in on a device that already has data: merge it into the account, or use the account's data. */
export default function Merge() {
  const { t } = useTranslation();
  const sync = useSync();
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');
  const [busy, setBusy] = useState(false);

  const go = async () => {
    if (mode === 'replace') {
      const ok = await confirm({ title: t('privacy.confirmTitle'), message: t('auth.replaceHint'), confirmLabel: t('common.continue'), cancelLabel: t('common.cancel'), destructive: true });
      if (!ok) return;
    }
    setBusy(true);
    await sync.decide(mode);
    setBusy(false);
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <Screen title={t('auth.mergeTitle')} subtitle={t('auth.mergeBody')} footer={<Button label={t('common.continue')} onPress={() => void go()} loading={busy} />}>
      <OptionCard title={t('auth.merge')} subtitle={t('auth.mergeHint')} selected={mode === 'merge'} onPress={() => setMode('merge')} />
      <OptionCard title={t('auth.replace')} subtitle={t('auth.replaceHint')} selected={mode === 'replace'} onPress={() => setMode('replace')} />
    </Screen>
  );
}
