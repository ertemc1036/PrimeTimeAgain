import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Card, Screen, TextField } from '@/components/ui';
import { isSupabaseConfigured } from '@/config/env';
import { getSupabase } from '@/services/supabase/client';
import { useAppState } from '@/state/AppStateProvider';
import { confirm } from '@/utils/confirm';

export default function Account() {
  const { t } = useTranslation();
  const { resetAll } = useAppState();
  const configured = isSupabaseConfigured();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!configured) return;
    void getSupabase().then(async (sb) => {
      const { data } = (await sb?.auth.getUser()) ?? { data: { user: null } };
      setUser(data.user?.email ?? null);
    });
  }, [configured]);

  const auth = async (mode: 'in' | 'up') => {
    const sb = await getSupabase();
    if (!sb) return;
    setBusy(true);
    setMessage(null);
    const res = mode === 'in' ? await sb.auth.signInWithPassword({ email: email.trim(), password }) : await sb.auth.signUp({ email: email.trim(), password });
    setBusy(false);
    if (res.error) return setMessage(t('account.error'));
    if (mode === 'up' && !res.data.session) return setMessage(t('account.checkEmail'));
    setUser(res.data.user?.email ?? email.trim());
  };

  const signOut = async () => {
    const sb = await getSupabase();
    await sb?.auth.signOut();
    setUser(null);
  };

  const deleteAccount = async () => {
    if (!(await confirm({ title: t('account.delete'), message: t('account.deleteBody'), confirmLabel: t('common.delete'), cancelLabel: t('common.cancel'), destructive: true }))) return;
    const sb = await getSupabase();
    if (sb && user) {
      // Server-side deletion of the account and all cloud rows/files (service role stays on the server).
      const { error } = await sb.functions.invoke('delete-account', { body: {} });
      if (error) return setMessage(t('states.saveError'));
      await sb.auth.signOut();
    }
    await resetAll();
    router.replace('/');
  };

  return (
    <Screen back="back" title={t('account.title')}>
      {!configured ? (
        <Card>
          <AppText variant="bodyStrong">{t('account.localOnly')}</AppText>
          <AppText variant="caption">{t('account.localBody')}</AppText>
        </Card>
      ) : user ? (
        <>
          <AppText variant="bodyStrong">{t('account.signedInAs', { email: user })}</AppText>
          <Button label={t('account.signOut')} variant="secondary" onPress={() => void signOut()} />
        </>
      ) : (
        <>
          <TextField label={t('account.email')} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" textContentType="emailAddress" autoComplete="email" />
          <TextField label={t('account.password')} value={password} onChangeText={setPassword} secureTextEntry textContentType="password" autoComplete="password" />
          <Button label={t('account.signIn')} onPress={() => void auth('in')} loading={busy} />
          <Button label={t('account.signUp')} variant="secondary" onPress={() => void auth('up')} disabled={busy} />
        </>
      )}
      {message ? <AppText variant="bodyStrong">{message}</AppText> : null}
      <Button label={t('account.delete')} variant="ghost" onPress={() => void deleteAccount()} />
      <AppText variant="caption" color="secondary">
        {t('account.deleteBody')}
      </AppText>
    </Screen>
  );
}
