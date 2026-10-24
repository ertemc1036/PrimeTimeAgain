import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Screen } from '@/components/ui';
import { colors, radii, spacing } from '@/theme';

export const ONBOARDING_STEPS = 5;

export function OnboardingStep({
  step,
  title,
  subtitle,
  children,
  onNext,
  nextLabel,
  nextDisabled,
  footerNote,
}: {
  step: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  footerNote?: string;
}) {
  const { t } = useTranslation();
  return (
    <Screen
      back="back"
      headerRight={
        <AppText variant="label" color={colors.textMuted}>
          {t('onboarding.step', { current: step, total: ONBOARDING_STEPS })}
        </AppText>
      }
      footer={
        <>
          {footerNote ? (
            <AppText variant="caption" color={colors.textSecondary} align="center" accessibilityLiveRegion="polite">
              {footerNote}
            </AppText>
          ) : null}
          <Button label={nextLabel ?? t('common.continue')} onPress={onNext} disabled={nextDisabled} icon="arrow-right" />
        </>
      }>
      <View
        style={styles.dots}
        accessible
        accessibilityLabel={t('onboarding.step', { current: step, total: ONBOARDING_STEPS })}>
        {Array.from({ length: ONBOARDING_STEPS }, (_, i) => (
          <View key={i} style={[styles.dot, i < step && styles.dotActive]} />
        ))}
      </View>
      <Animated.View entering={FadeInDown.duration(450)} style={styles.head}>
        <AppText variant="title">{title}</AppText>
        {subtitle ? (
          <AppText variant="body" color={colors.textSecondary}>
            {subtitle}
          </AppText>
        ) : null}
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(120).duration(450)} style={styles.body}>
        {children}
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  dots: { flexDirection: 'row', gap: spacing.xs },
  dot: { flex: 1, height: 4, borderRadius: radii.pill, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary },
  head: { gap: spacing.xs },
  body: { gap: spacing.sm },
});
