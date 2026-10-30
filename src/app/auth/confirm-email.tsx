import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Card, Screen, TextField, useToast } from '@/components/ui';
import { AuthError, useCloseAuth } from '@/features/auth/AuthError';
import { linkApple } from '@/services/appleAuth';
import { sendEmailCode, verifyEmailCode, type AuthErrorCode } from '@/services/auth';
import { useAuth } from '@/state/AuthProvider';
import { usePro } from '@/state/ProProvider';

/**
 * Confirm the signed-in account's email with an emailed code. Needed when sign-up doesn't ask for a
 * confirmation (Supabase "Confirm email" off): the server then records the proof, which secures a
 * founder seat and allows linking Apple. `next=link-apple` links Apple right after.
 */
export default function ConfirmEmail() {
  const closeAuth = useCloseAuth();
  const { t } = useTranslation();
  const toast = useToast();
  const auth = useAuth();
  const pro = usePro();
  const { next } = useLocalSearchParams<{ next?: string }>();
  const email = auth.user?.email ?? '';
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<null | 'send' | 'verify'>(null);
  const [error, setError] = useState<AuthErrorCode | null>(null);

  const leave = closeAuth;

  const send = async () => {
    setError(null);
    setBusy('send');
    const r = await sendEmailCode(email);
    setBusy(null);
    if (!r.ok) return setError(r.error);
    setSent(true);
    toast(t('auth.confirmEmailSent', { email }), 'mail-outline');
  };

  const verify = async () => {
    if (!/^\d{6}$/.test(code.trim())) return setError('invalid_code');
    setBusy('verify');
    const r = await verifyEmailCode(email, code);
    if (!r.ok) {
      setBusy(null);
      return setError(r.error);
    }
    await pro.refresh();
    if (next === 'link-apple') {
      const l = await linkApple();
      setBusy(null);
      if (!l.ok) {
        if (l.error !== 'cancelled') setError(l.error);
        toast(t('auth.confirmEmailDone'));
        return;
      }
      toast(t('auth.appleLinked'), 'checkmark-circle-outline');
      return leave();
    }
    setBusy(null);
    toast(t('auth.confirmEmailDone'), 'checkmark-circle-outline');
    leave();
  };

  if (!email) {
    return (
      <Screen back="close" title={t('auth.confirmEmailTitle')}>
        <Card>
          <AppText variant="body">{t('account.notSignedIn')}</AppText>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen
      back="close"
      title={t('auth.confirmEmailTitle')}
      subtitle={t('auth.confirmEmailBody', { email })}
      footer={
        <>
          {sent ? (
            <Button label={t('auth.verify')} onPress={() => void verify()} loading={busy === 'verify'} />
          ) : (
            <Button label={t('auth.sendCode')} onPress={() => void send()} loading={busy === 'send'} />
          )}
          {sent ? <Button label={t('auth.resend')} variant="ghost" size="sm" onPress={() => void send()} loading={busy === 'send'} /> : null}
          {next !== 'link-apple' ? <Button label={t('auth.later')} variant="ghost" size="sm" onPress={leave} /> : null}
        </>
      }>
      {next === 'link-apple' ? (
        <Card>
          <AppText variant="body">{t('auth.linkNeedsEmail')}</AppText>
        </Card>
      ) : null}
      {sent ? <TextField label={t('auth.code')} value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} autoComplete="one-time-code" textContentType="oneTimeCode" autoFocus /> : null}
      <AuthError code={error} />
    </Screen>
  );
}
