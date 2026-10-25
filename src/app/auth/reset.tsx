import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button, Screen, TextField, useToast } from '@/components/ui';
import { AuthError, useCloseAuth } from '@/features/auth/AuthError';
import { PASSWORD_MIN, requestPasswordReset, resetPassword, validEmail, type AuthErrorCode } from '@/services/auth';

export default function Reset() {
  const closeAuth = useCloseAuth();
  const { t } = useTranslation();
  const toast = useToast();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AuthErrorCode | null>(null);

  const send = async () => {
    if (!validEmail(email)) return setError('invalid_email');
    setBusy(true);
    const r = await requestPasswordReset(email);
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setError(null);
    setSent(true);
  };
  const confirm = async () => {
    if (!/^\d{6}$/.test(code.trim())) return setError('invalid_code');
    if (password.length < PASSWORD_MIN) return setError('weak_password');
    setBusy(true);
    const r = await resetPassword(email, code, password);
    setBusy(false);
    if (!r.ok) return setError(r.error);
    toast(t('auth.resetDone'));
    closeAuth();
  };

  return (
    <Screen
      back="close"
      title={t('auth.resetTitle')}
      subtitle={sent ? t('auth.resetCodeBody', { email }) : t('auth.resetBody')}
      footer={
        sent ? (
          <>
            <Button label={t('common.save')} onPress={() => void confirm()} loading={busy} />
            <Button label={t('auth.resend')} variant="ghost" size="sm" onPress={() => void send()} />
          </>
        ) : (
          <Button label={t('auth.sendCode')} onPress={() => void send()} loading={busy} />
        )
      }>
      {!sent ? (
        <TextField label={t('auth.email')} value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" />
      ) : (
        <>
          <TextField label={t('auth.code')} value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} autoComplete="one-time-code" textContentType="oneTimeCode" />
          <TextField label={t('auth.newPassword')} hint={t('auth.passwordHint')} value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" textContentType="newPassword" />
        </>
      )}
      <AuthError code={error} />
    </Screen>
  );
}
