import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button, Screen, TextField, useToast } from '@/components/ui';
import { AuthError, closeAuth } from '@/features/auth/AuthError';
import { authAvailable, PASSWORD_MIN, signUp, validEmail, type AuthErrorCode } from '@/services/auth';

export default function SignUp() {
  const { t } = useTranslation();
  const toast = useToast();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AuthErrorCode | null>(authAvailable() ? null : 'not_configured');

  const submit = async () => {
    if (!validEmail(email)) return setError('invalid_email');
    if (password.length < PASSWORD_MIN) return setError('weak_password');
    setBusy(true);
    const r = await signUp(email, password);
    setBusy(false);
    if (!r.ok) return setError(r.error);
    if (r.value.needsCode) return router.replace({ pathname: '/auth/verify', params: { email } });
    toast(t('auth.signedIn'));
    closeAuth(router);
  };

  return (
    <Screen
      back="close"
      title={t('auth.createTitle')}
      subtitle={t('auth.createSubtitle')}
      footer={
        <>
          <Button label={t('auth.create')} onPress={() => void submit()} loading={busy} disabled={!authAvailable()} />
          <Button label={t('auth.haveAccount')} variant="ghost" size="sm" onPress={() => router.replace({ pathname: '/auth/sign-in', params: { email } })} />
        </>
      }>
      <TextField label={t('auth.email')} value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" />
      <TextField label={t('auth.password')} hint={t('auth.passwordHint')} value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" textContentType="newPassword" />
      <AuthError code={error} />
    </Screen>
  );
}
