import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button, Screen, TextField, useToast } from '@/components/ui';
import { AppleSignIn } from '@/features/auth/AppleSignIn';
import { AuthError, useCloseAuth } from '@/features/auth/AuthError';
import { authAvailable, PASSWORD_MIN, signUp, validEmail, type AuthErrorCode } from '@/services/auth';
import { useFounderStatus } from '@/features/founders/useFounderStatus';

export default function SignUp() {
  const closeAuth = useCloseAuth();
  const { t } = useTranslation();
  const toast = useToast();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AuthErrorCode | null>(authAvailable() ? null : 'not_configured');
  // Loaded up front: after sign-up the next screen must be chosen at once (an "existing data on this
  // device" prompt may open right after the sign-in and must not be closed by a late navigation).
  const founders = useFounderStatus();

  const submit = async () => {
    if (!validEmail(email)) return setError('invalid_email');
    if (password.length < PASSWORD_MIN) return setError('weak_password');
    setBusy(true);
    const r = await signUp(email, password);
    setBusy(false);
    if (!r.ok) return setError(r.error);
    if (r.value.needsCode) return router.push({ pathname: '/auth/verify', params: { email } });
    toast(t('auth.signedIn'));
    // No confirmation required by the project: while founder seats are left, offer the (optional)
    // email confirmation right away, because it secures a seat.
    if (founders.status && founders.status.remaining > 0) return router.replace('/auth/confirm-email');
    closeAuth();
  };

  return (
    <Screen
      back="close"
      title={t('auth.createTitle')}
      subtitle={t('auth.createSubtitle')}
      footer={
        <>
          <Button label={t('auth.create')} onPress={() => void submit()} loading={busy} disabled={!authAvailable()} />
          <Button label={t('auth.haveAccount')} variant="ghost" size="sm" onPress={() => router.push({ pathname: '/auth/sign-in', params: { email } })} />
        </>
      }>
      <AppleSignIn type="continue" onError={setError} onSignedIn={closeAuth} />
      <TextField label={t('auth.email')} value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" />
      <TextField label={t('auth.password')} hint={t('auth.passwordHint')} value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" textContentType="newPassword" />
      <AuthError code={error} />
    </Screen>
  );
}
