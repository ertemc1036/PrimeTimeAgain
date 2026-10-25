import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button, Screen, TextField, useToast } from '@/components/ui';
import { AuthError, useCloseAuth } from '@/features/auth/AuthError';
import { confirmSignUp, resendSignUpCode, type AuthErrorCode } from '@/services/auth';

export default function Verify() {
  const closeAuth = useCloseAuth();
  const { t } = useTranslation();
  const toast = useToast();
  const { email = '' } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AuthErrorCode | null>(null);

  const submit = async () => {
    if (!/^\d{6}$/.test(code.trim())) return setError('invalid_code');
    setBusy(true);
    const r = await confirmSignUp(email, code);
    setBusy(false);
    if (!r.ok) return setError(r.error);
    toast(t('auth.signedIn'));
    closeAuth();
  };
  const resend = async () => {
    const r = await resendSignUpCode(email);
    if (r.ok) toast(t('auth.resent'), 'mail-outline');
    else setError(r.error);
  };

  return (
    <Screen
      back="close"
      title={t('auth.verifyTitle')}
      subtitle={t('auth.verifyBody', { email })}
      footer={
        <>
          <Button label={t('auth.verify')} onPress={() => void submit()} loading={busy} />
          <Button label={t('auth.resend')} variant="ghost" size="sm" onPress={() => void resend()} />
        </>
      }>
      <TextField label={t('auth.code')} value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} autoComplete="one-time-code" textContentType="oneTimeCode" autoFocus />
      <AuthError code={error} />
    </Screen>
  );
}
