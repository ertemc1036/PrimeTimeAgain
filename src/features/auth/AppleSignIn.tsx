import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, useToast } from '@/components/ui';
import { appleAvailable, signInWithApple } from '@/services/appleAuth';
import { authAvailable, type AuthErrorCode } from '@/services/auth';
import { colors, spacing } from '@/theme';

/**
 * Native "Sign in with Apple" button (iOS only; renders nothing elsewhere), followed by a hint for
 * existing email users and an "or with email" divider. Apple's button must keep its own colours and
 * shape (App Store guidelines), so only height and corner radius are set.
 */
export function AppleSignIn({ type, onError, onSignedIn }: { type: 'signIn' | 'continue'; onError(code: AuthErrorCode | null): void; onSignedIn(): void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [available, setAvailable] = useState(false);
  const busy = useRef(false);

  useEffect(() => {
    let active = true;
    if (authAvailable()) void appleAvailable().then((v) => active && setAvailable(v));
    return () => {
      active = false;
    };
  }, []);

  if (!available) return null;

  const press = async () => {
    if (busy.current) return;
    busy.current = true;
    onError(null);
    const r = await signInWithApple();
    busy.current = false;
    if (!r.ok) {
      if (r.error !== 'cancelled') onError(r.error);
      return;
    }
    toast(r.value.isNew ? t('auth.appleNew') : t('auth.signedIn'));
    onSignedIn();
  };

  return (
    <View style={styles.wrap}>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={type === 'signIn' ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN : AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={28}
        style={styles.button}
        onPress={() => void press()}
      />
      <AppText variant="caption" color="secondary">
        {t('auth.appleHint')}
      </AppText>
      <View style={styles.divider}>
        <View style={styles.line} />
        <AppText variant="caption" color="secondary">
          {t('auth.orEmail')}
        </AppText>
        <View style={styles.line} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  button: { width: '100%', height: 52 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  line: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
});
