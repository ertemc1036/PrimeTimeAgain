import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, ProgressBar, Screen } from '@/components/ui';
import { spacing } from '@/theme';

import { ONBOARDING_STEPS } from './draft';

export function OnboardingStep({
  step,
  title,
  subtitle,
  children,
  onContinue,
  continueLabel,
  disabled,
  secondary,
}: {
  step: number;
  title: string;
  subtitle?: string;
  children?: ReactNode;
  onContinue: () => void;
  continueLabel?: string;
  disabled?: boolean;
  secondary?: { label: string; onPress: () => void };
}) {
  const { t } = useTranslation();
  return (
    <Screen
      back="back"
      eyebrow={t('onboarding.step', { current: step, total: ONBOARDING_STEPS })}
      title={title}
      subtitle={subtitle}
      footer={
        <>
          <Button label={continueLabel ?? t('common.continue')} onPress={onContinue} disabled={disabled} />
          {secondary ? <Button label={secondary.label} onPress={secondary.onPress} variant="ghost" /> : null}
        </>
      }>
      <View style={styles.progress}>
        <ProgressBar progress={step / ONBOARDING_STEPS} height={4} />
      </View>
      {children}
    </Screen>
  );
}

const styles = StyleSheet.create({ progress: { marginTop: -spacing.xs } });
