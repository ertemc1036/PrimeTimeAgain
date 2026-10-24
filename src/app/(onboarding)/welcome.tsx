import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText, Button, PhotoHero } from '@/components/ui';
import { colors, imagery, layout, palette, spacing } from '@/theme';

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <Animated.View entering={FadeIn.duration(700)} style={styles.heroWrap}>
        <PhotoHero uri={imagery.welcome} height={0} rounded={false} style={styles.hero}>
          <View style={{ paddingTop: insets.top }} />
        </PhotoHero>
      </Animated.View>

      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        <View style={styles.inner}>
          <Animated.View entering={FadeInDown.delay(150).duration(500)} style={styles.copy}>
            <AppText variant="overline" color={colors.primaryText}>
              {t('welcome.eyebrow')}
            </AppText>
            <AppText variant="display">{t('welcome.headline')}</AppText>
            <AppText variant="body" color={colors.textSecondary}>
              {t('welcome.subhead')}
            </AppText>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.actions}>
            <Button label={t('welcome.getStarted')} icon="arrow-right" onPress={() => router.push('/choose-language')} />
            <AppText variant="caption" color={colors.textMuted} align="center">
              {t('welcome.footnote')}
            </AppText>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.sage },
  heroWrap: { flex: 1 },
  hero: { flex: 1 },
  sheet: {
    marginTop: -32,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: colors.background,
    paddingHorizontal: layout.screenPadding,
    paddingTop: spacing.xxl,
  },
  inner: { width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center', gap: spacing.xl },
  copy: { gap: spacing.sm },
  actions: { gap: spacing.sm },
});
