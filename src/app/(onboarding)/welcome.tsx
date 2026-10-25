import { router, useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Image } from 'expo-image';

import { AppText, Button, IconButton } from '@/components/ui';
import { authAvailable } from '@/services/auth';
import { colors, layout, spacing } from '@/theme';

export default function Welcome() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  // Light status bar only while this black screen is visible (it stays mounted under the next steps).
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle('dark');
    }, []),
  );
  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.xxxl, paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
      <View style={[styles.lang, { top: insets.top + spacing.xs }]}>
        <IconButton icon="globe-outline" label={t('common.language')} onPress={() => router.push('/language')} variant="inverse" color={colors.white} />
      </View>
      <View style={styles.center}>
        <Image
          source={require('../../../assets/images/logo-wordmark.png')}
          style={styles.logo}
          contentFit="contain"
          accessible
          accessibilityRole="header"
          accessibilityLabel={t('brand.name')}
        />
        <AppText variant="heading" color={colors.white} align="center">
          {t('onboarding.welcome.subtitle')}
        </AppText>
        <AppText variant="body" color="#BDBDBD" align="center">
          {t('brand.slogan')}
        </AppText>
      </View>
      <View style={styles.bottom}>
        <AppText variant="label" color="#BDBDBD" align="center">
          {t('onboarding.welcome.loop')}
        </AppText>
        <View style={styles.cta}>
          <PrimaryInverse label={t('onboarding.welcome.cta')} onPress={() => router.push('/profile')} />
        </View>
        {authAvailable() ? (
          <Pressable onPress={() => router.push('/auth/sign-in')} accessibilityRole="button" style={styles.signIn}>
            <AppText variant="bodyStrong" color={colors.white} align="center">
              {t('auth.welcomeSignIn')}
            </AppText>
          </Pressable>
        ) : null}
        <AppText variant="caption" color="#BDBDBD" align="center">
          {t('onboarding.welcome.adults')}
        </AppText>
      </View>
    </View>
  );
}

/** White button on the black welcome screen. */
function PrimaryInverse({ label, onPress }: { label: string; onPress: () => void }) {
  return <Button label={label} onPress={onPress} variant="outline" />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.black, paddingHorizontal: layout.screenPadding },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  logo: { width: 260, aspectRatio: 957 / 188, marginBottom: spacing.md },
  lang: { position: 'absolute', right: layout.screenPadding, zIndex: 1 },
  bottom: { gap: spacing.md, width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center' },
  cta: { width: '100%' },
  signIn: { minHeight: 44, justifyContent: 'center' },
});
