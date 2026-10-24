import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { OnboardingStep } from '@/components/onboarding/OnboardingStep';
import { AppText, Icon, type IconName } from '@/components/ui';
import { radii, spacing, useColors } from '@/theme';

const STEPS: { key: 's1' | 's2' | 's3'; icon: IconName }[] = [
  { key: 's1', icon: 'crosshair' },
  { key: 's2', icon: 'layers' },
  { key: 's3', icon: 'zap' },
];

/** Screen 2: the value of PrimeTimeAgain in three steps. */
export default function HowScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  return (
    <OnboardingStep step={1} title={t('onboarding.how.title')} subtitle={t('onboarding.how.subtitle')} onNext={() => router.push('/define')}>
      {STEPS.map((s, i) => (
        <Animated.View key={s.key} entering={FadeInDown.delay(150 + i * 120).duration(450)} style={[styles.row, { borderColor: colors.border }]}>
          <View style={[styles.num, { backgroundColor: colors.accent }]}>
            <AppText variant="heading" color={colors.onAccent}>
              {String(i + 1)}
            </AppText>
          </View>
          <View style={styles.text}>
            <AppText variant="heading">{t(`onboarding.how.${s.key}.title`)}</AppText>
            <AppText variant="caption" color="secondary">
              {t(`onboarding.how.${s.key}.body`)}
            </AppText>
          </View>
          <Icon name={s.icon} size={20} color={colors.textSecondary} />
        </Animated.View>
      ))}
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth },
  num: { width: 44, height: 44, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 4 },
});
