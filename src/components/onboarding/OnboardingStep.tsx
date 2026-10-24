import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Screen } from '@/components/ui';
import { radii, spacing, useColors } from '@/theme';

export const ONBOARDING_STEPS = 7;

export function OnboardingStep({
  step,
  title,
  subtitle,
  children,
  onNext,
  nextLabel,
  nextDisabled,
  footerNote,
  onSkip,
}: {
  step: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  footerNote?: string;
  onSkip?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Screen
      back="back"
      headerRight={
        <View style={styles.headerRight}>
          <AppText variant="label" color="secondary">
            {t('onboarding.step', { current: step, total: ONBOARDING_STEPS })}
          </AppText>
          {onSkip ? (
            <Pressable onPress={onSkip} accessibilityRole="button" hitSlop={10}>
              <AppText variant="label">{t('common.skip')}</AppText>
            </Pressable>
          ) : null}
        </View>
      }
      footer={
        <>
          {footerNote ? (
            <AppText variant="caption" color="secondary" align="center" accessibilityLiveRegion="polite">
              {footerNote}
            </AppText>
          ) : null}
          <Button label={nextLabel ?? t('common.continue')} onPress={onNext} disabled={nextDisabled} icon="arrow-right" />
        </>
      }>
      <Segments step={step} />
      <Animated.View entering={FadeInDown.duration(420)} style={styles.head}>
        <AppText variant="display">{title}</AppText>
        {subtitle ? (
          <AppText variant="body" color="secondary">
            {subtitle}
          </AppText>
        ) : null}
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(110).duration(420)} style={styles.body}>
        {children}
      </Animated.View>
    </Screen>
  );
}

function Segments({ step }: { step: number }) {
  const colors = useColors();
  const { t } = useTranslation();
  return (
    <View style={styles.dots} accessible accessibilityLabel={t('onboarding.step', { current: step, total: ONBOARDING_STEPS })}>
      {Array.from({ length: ONBOARDING_STEPS }, (_, i) => (
        <View key={i} style={[styles.dot, { backgroundColor: i < step ? colors.accent : colors.border }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  dots: { flexDirection: 'row', gap: 4 },
  dot: { flex: 1, height: 3, borderRadius: radii.pill },
  head: { gap: spacing.xs },
  body: { gap: spacing.sm },
});
