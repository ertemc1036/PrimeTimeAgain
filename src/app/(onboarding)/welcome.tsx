import { router, useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText, Button, IconButton } from '@/components/ui';
import { PrimeCharacter } from '@/features/prime/character/PrimeCharacter';
import { authAvailable } from '@/services/auth';
import { colors, fonts, layout, spacing } from '@/theme';

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
        <PrimeCharacter variant="welcome" size={260} radius={0} motion="idle" accessibilityLabel={t('brand.agent')} />
        <Text style={styles.wordmark} accessibilityRole="header" maxFontSizeMultiplier={1.2}>
          {t('brand.name')}
        </Text>
        <AppText variant="body" color={colors.white} align="center">
          {t('onboarding.welcome.subtitle')}
        </AppText>
        <AppText variant="subheading" color={colors.onDarkMuted} align="center">
          {t('brand.slogan')}
        </AppText>
      </View>
      <View style={styles.bottom}>
        <AppText variant="label" color={colors.onDarkMuted} align="center">
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
        <AppText variant="caption" color={colors.onDarkMuted} align="center">
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
  // Same near-black as Prime's studio renders, so the character blends into the screen.
  root: { flex: 1, backgroundColor: colors.primeBackdrop, paddingHorizontal: layout.screenPadding },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  wordmark: { color: colors.white, fontFamily: fonts.bold, fontSize: 40, lineHeight: 46, letterSpacing: -1.2 },
  lang: { position: 'absolute', right: layout.screenPadding, zIndex: 1 },
  bottom: { gap: spacing.md, width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center' },
  cta: { width: '100%' },
  signIn: { minHeight: 44, justifyContent: 'center' },
});
