import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Card, Icon, Screen, useToast } from '@/components/ui';
import { formatDate } from '@/i18n/format';
import { useLocale } from '@/i18n/useLanguage';
import { useAuth } from '@/state/AuthProvider';
import { useSync } from '@/state/SyncProvider';
import { colors, spacing } from '@/theme';
import { confirm, notify } from '@/utils/confirm';

export default function Account() {
  const { t } = useTranslation();
  const locale = useLocale();
  const toast = useToast();
  const auth = useAuth();
  const sync = useSync();
  const [busy, setBusy] = useState<null | 'signout' | 'delete' | 'sync'>(null);

  const signOut = async () => {
    if (!(await confirm({ title: t('account.signOutTitle'), message: t('account.signOutBody'), confirmLabel: t('account.signOut'), cancelLabel: t('common.cancel') }))) return;
    setBusy('signout');
    let r = await sync.signOut();
    if (!r.ok) {
      const force = await confirm({ title: t('account.unsyncedTitle'), message: t('account.unsyncedBody', { count: r.unsynced }), confirmLabel: t('account.signOutAnyway'), cancelLabel: t('common.cancel'), destructive: true });
      if (force) r = await sync.signOut({ force: true });
    }
    setBusy(null);
    if (r.ok) router.replace('/');
  };

  const remove = async () => {
    if (!(await confirm({ title: t('account.delete'), message: t('account.deleteBody'), confirmLabel: t('account.deleteConfirm'), cancelLabel: t('common.cancel'), destructive: true }))) return;
    setBusy('delete');
    const ok = await sync.deleteAccount();
    setBusy(null);
    if (!ok) return notify(t('account.delete'), t('account.deleteFailed'));
    toast(t('account.deleted'));
    router.replace('/');
  };

  const syncNow = async () => {
    setBusy('sync');
    await sync.syncNow();
    setBusy(null);
  };

  if (!auth.configured) {
    return (
      <Screen back="back" title={t('account.title')}>
        <Card>
          <AppText variant="bodyStrong">{t('account.localOnly')}</AppText>
          <AppText variant="caption">{t('account.localBody')}</AppText>
        </Card>
      </Screen>
    );
  }

  if (auth.status !== 'signedIn') {
    return (
      <Screen back="back" title={t('account.signedOutTitle')} subtitle={t('account.signedOutBody')}>
        {sync.status === 'signedOut' ? (
          <Card>
            <AppText variant="body">{t('sync.signedOut')}</AppText>
          </Card>
        ) : null}
        <Button label={t('auth.create')} onPress={() => router.push('/auth/sign-up')} />
        <Button label={t('auth.signIn')} variant="secondary" onPress={() => router.push('/auth/sign-in')} />
      </Screen>
    );
  }

  const statusText =
    sync.status === 'syncing' ? t('sync.syncing') : sync.status === 'offline' ? t('sync.offline') : sync.status === 'error' ? t('sync.error') : sync.status === 'signedOut' ? t('sync.signedOut') : t('sync.on');
  const last = sync.lastSyncAt
    ? t('sync.last', { time: formatDate(sync.lastSyncAt.slice(0, 10), locale, { day: 'numeric', month: 'short' }) + ' ' + new Date(sync.lastSyncAt).toTimeString().slice(0, 5) })
    : t('sync.never');

  return (
    <Screen back="back" title={t('account.title')}>
      <AppText variant="bodyStrong">{t('account.signedInAs', { email: auth.user?.email ?? '' })}</AppText>
      <Card style={styles.gap}>
        <View style={styles.row}>
          <Icon name={sync.status === 'idle' ? 'cloud-done-outline' : sync.status === 'syncing' ? 'sync-outline' : 'cloud-offline-outline'} size={22} />
          <View style={styles.flex}>
            <AppText variant="bodyStrong">{t('sync.title')}</AppText>
            <AppText variant="caption" color="secondary" accessibilityLiveRegion="polite">
              {statusText}
            </AppText>
          </View>
        </View>
        <AppText variant="caption" color="secondary">
          {last}
        </AppText>
        {sync.pending ? <AppText variant="caption">{t('sync.pending', { count: sync.pending })}</AppText> : null}
        {sync.failed ? (
          <View style={styles.gap}>
            <AppText variant="caption" color={colors.text}>
              {t('sync.failed', { count: sync.failed })}
            </AppText>
            <View style={styles.row}>
              <Button label={t('sync.retryFailed')} size="sm" variant="secondary" fullWidth={false} onPress={() => void sync.resolveFailed('retry')} />
              <Button label={t('sync.discardFailed')} size="sm" variant="ghost" fullWidth={false} onPress={() => void sync.resolveFailed('discard')} />
            </View>
          </View>
        ) : null}
        <Button label={t('sync.now')} size="sm" variant="secondary" onPress={() => void syncNow()} loading={busy === 'sync'} />
      </Card>
      <Button label={t('account.signOut')} variant="secondary" onPress={() => void signOut()} loading={busy === 'signout'} />
      <Button label={t('account.delete')} variant="ghost" onPress={() => void remove()} loading={busy === 'delete'} />
      <AppText variant="caption" color="secondary">
        {t('account.deleteBody')}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1, gap: 2 },
});
