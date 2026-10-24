import { router, useIsFocused } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AvatarViewer } from '@/avatar/AvatarViewer';
import { useOnboardingDraft } from '@/components/onboarding/OnboardingDraft';
import { AppText, Button, Icon, PressableScale } from '@/components/ui';
import { BRAND_NAME, TAGLINE } from '@/config/brand';
import { getLanguage } from '@/i18n/languages';
import { useLanguage } from '@/i18n/useLanguage';
import { darkColors, layout, lightColors, palette, radii, spacing, ThemeProvider } from '@/theme';

/** Screen 1: a cinematic black stage with the live 3D avatar above a bright, bold white panel. */
export default function WelcomeScreen() {
  const { t } = useTranslation();
  const { code } = useLanguage();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const { draft } = useOnboardingDraft();

  return (
    <View style={styles.root}>
      <ThemeProvider mode="dark">
        <Animated.View entering={FadeIn.duration(900)} style={styles.stage}>
          {draft.avatar ? (
            <AvatarViewer config={draft.avatar} active={focused} interactive={false} autoRotate background={darkColors.background} />
          ) : null}
          <View style={[styles.topBar, { paddingTop: insets.top + spacing.xs }]}>
            <AppText variant="subheading" color={palette.white} accessibilityRole="header">
              {BRAND_NAME}
            </AppText>
            <PressableScale
              onPress={() => router.push('/language')}
              accessibilityRole="button"
              accessibilityLabel={`${t('welcome.language')}: ${getLanguage(code).nativeName}`}
              style={styles.lang}>
              <Icon name="globe" size={15} color={palette.white} />
              <AppText variant="label" color={palette.white}>
                {code.toUpperCase()}
              </AppText>
            </PressableScale>
          </View>
        </Animated.View>
      </ThemeProvider>

      <ThemeProvider mode="light">
        <View style={[styles.panel, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
          <View style={styles.inner}>
            <Animated.View entering={FadeInDown.delay(200).duration(600)} style={styles.copy}>
              <AppText variant="hero">{t('welcome.headline')}</AppText>
              <AppText variant="heading">{TAGLINE}</AppText>
              <AppText variant="body" color="secondary">
                {t('welcome.body')}
              </AppText>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(380).duration(600)} style={styles.actions}>
              <Button label={t('welcome.cta')} icon="arrow-right" onPress={() => router.push('/how')} />
              <AppText variant="caption" color="secondary" align="center">
                {t('welcome.footnote')}
              </AppText>
            </Animated.View>
          </View>
        </View>
      </ThemeProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: darkColors.background },
  stage: { flex: 1, minHeight: 280 },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: layout.screenPadding,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lang: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    minHeight: layout.minTouchTarget,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  panel: {
    backgroundColor: lightColors.background,
    borderTopLeftRadius: radii.lg + 6,
    borderTopRightRadius: radii.lg + 6,
    marginTop: -24,
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.xl,
  },
  inner: { width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center', gap: spacing.xl },
  copy: { gap: spacing.sm },
  actions: { gap: spacing.sm },
});
