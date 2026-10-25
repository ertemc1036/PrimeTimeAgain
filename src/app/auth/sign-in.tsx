import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button, Card, AppText, Screen, TextField, useToast } from '@/components/ui';
import { AuthError, useCloseAuth } from '@/features/auth/AuthError';
import { authAvailable, signIn, validEmail, type AuthErrorCode } from '@/services/auth';

export default function SignIn() {
  const closeAuth = useCloseAuth();
  const { t } = useTranslation();
  const toast = useToast();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AuthErrorCode | null>(authAvailable() ? null : 'not_configured');

  const submit = async () => {
    if (!validEmail(email)) return setError('invalid_email');
    if (!password) return setError('invalid_credentials');
    setBusy(true);
    const r = await signIn(email, password);
    setBusy(false);
    if (!r.ok) {
      if (r.error === 'email_not_confirmed') return router.push({ pathname: '/auth/verify', params: { email } });
      return setError(r.error);
    }
    toast(t('auth.signedIn'));
    closeAuth();
  };

  return (
    <Screen
      back="close"
      title={t('auth.signInTitle')}
      subtitle={t('auth.signInSubtitle')}
      footer={
        <>
          <Button label={t('auth.signIn')} onPress={() => void submit()} loading={busy} disabled={!authAvailable()} />
          <Button label={t('auth.noAccount')} variant="ghost" size="sm" onPress={() => router.push({ pathname: '/auth/sign-up', params: { email } })} />
        </>
      }>
      {!authAvailable() ? (
        <Card>
          <AppText variant="body">{t('auth.errors.not_configured')}</AppText>
        </Card>
      ) : null}
      <TextField label={t('auth.email')} value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" />
      <TextField label={t('auth.password')} value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" textContentType="password" onSubmitEditing={() => void submit()} />
      <AuthError code={error} />
      <Button label={t('auth.forgot')} variant="ghost" size="sm" fullWidth={false} onPress={() => router.push({ pathname: '/auth/reset', params: { email } })} />
    </Screen>
  );
}
