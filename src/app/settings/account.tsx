import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Card, Icon, Screen, useToast } from '@/components/ui';
import { formatDate } from '@/i18n/format';
import { useLocale } from '@/i18n/useLanguage';
import { appleAvailable, linkApple } from '@/services/appleAuth';
import { signInMethods } from '@/services/auth';
import { useAuth } from '@/state/AuthProvider';
import { usePro } from '@/state/ProProvider';
import { useSync } from '@/state/SyncProvider';
import { colors, spacing } from '@/theme';
import { confirm, notify } from '@/utils/confirm';

export default function Account() {
  const { t } = useTranslation();
  const locale = useLocale();
  const toast = useToast();
  const auth = useAuth();
  const sync = useSync();
  const pro = usePro();
  const [busy, setBusy] = useState<null | 'signout' | 'delete' | 'sync' | 'apple'>(null);
  const [methods, setMethods] = useState<string[] | null>(null);
  const [canApple, setCanApple] = useState(false);
  const signedIn = auth.status === 'signedIn';

  // Sign-in methods of this account (reloaded when coming back, e.g. after confirming the email).
  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (signedIn) {
        void signInMethods().then((r) => active && r.ok && setMethods(r.value));
        void appleAvailable().then((v) => active && setCanApple(v));
      }
      return () => {
        active = false;
      };
    }, [signedIn]),
  );

  const addApple = async () => {
    // Apple can only be attached to an email account whose address is proven (server rule).
    if (methods?.includes('email') && pro.identityVerified === false) return router.push({ pathname: '/auth/confirm-email', params: { next: 'link-apple' } });
    setBusy('apple');
    const r = await linkApple();
    setBusy(null);
    if (!r.ok) {
      if (r.error !== 'cancelled') notify(t('auth.linkApple'), t(`auth.errors.${r.error}`));
      return;
    }
    toast(t('auth.appleLinked'), 'checkmark-circle-outline');
    const m = await signInMethods();
    if (m.ok) setMethods(m.value);
    await pro.refresh();
  };

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
        {sync.status === 'signedOut' ? (
          <Button label={t('auth.signIn')} size="sm" onPress={() => router.push({ pathname: '/auth/sign-in', params: { email: auth.user?.email ?? '' } })} />
        ) : (
          <Button label={t('sync.now')} size="sm" variant="secondary" onPress={() => void syncNow()} loading={busy === 'sync'} />
        )}
      </Card>
      <Card style={styles.gap}>
        <AppText variant="bodyStrong">{t('common.pro')}</AppText>
        <AppText variant="caption" color="secondary">
          {!pro.isPro ? t('profile.free') : pro.access === 'test' ? t('pro.sourceTest') : pro.access === 'founder' ? (pro.founderSeat ? t('pro.sourceFounderSeat', { seat: pro.founderSeat }) : t('pro.sourceFounder')) : t('profile.proActive')}
        </AppText>
      </Card>
      {methods ? (
        <Card style={styles.gap}>
          <AppText variant="bodyStrong">{t('auth.methodsTitle')}</AppText>
          {methods.includes('email') ? (
            <View style={styles.method}>
              <AppText variant="body">{t('auth.methodEmail')}</AppText>
              <AppText variant="caption" color="secondary">
                {pro.identityVerified === false ? t('auth.emailNotVerified') : pro.identityVerified ? t('auth.emailVerified') : ''}
              </AppText>
            </View>
          ) : null}
          {methods.includes('email') && pro.identityVerified === false ? (
            <Button label={t('auth.confirmEmailCta')} size="sm" variant="secondary" fullWidth={false} onPress={() => router.push('/auth/confirm-email')} />
          ) : null}
          {methods.includes('apple') ? (
            <View style={styles.method}>
              <AppText variant="body">{t('auth.methodApple')}</AppText>
              <AppText variant="caption" color="secondary">
                {t('auth.linked')}
              </AppText>
            </View>
          ) : canApple ? (
            <Button label={t('auth.linkApple')} size="sm" variant="secondary" fullWidth={false} icon="logo-apple" onPress={() => void addApple()} loading={busy === 'apple'} />
          ) : null}
        </Card>
      ) : null}
      <Card style={styles.gap}>
        <AppText variant="bodyStrong">{t('account.id')}</AppText>
        <AppText variant="caption" selectable testID="account-id">
          {auth.user?.id ?? ''}
        </AppText>
        <AppText variant="caption" color="secondary">
          {t('account.idHint')}
        </AppText>
        <Button label={t('account.shareId')} size="sm" variant="secondary" fullWidth={false} onPress={() => void Share.share({ message: auth.user?.id ?? '' }).catch(() => undefined)} />
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
  method: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
});
