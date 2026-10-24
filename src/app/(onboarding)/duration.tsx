import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useOnboardingDraft } from '@/components/onboarding/OnboardingDraft';
import { OnboardingStep } from '@/components/onboarding/OnboardingStep';
import { DurationPicker } from '@/components/plan/DurationPicker';
import { spacing } from '@/theme';

/** Screen 6: comeback duration (30 / 60 / 90 / 180 / custom). 90 days recommended. */
export default function DurationScreen() {
  const { t } = useTranslation();
  const { draft, update } = useOnboardingDraft();
  const [value, setValue] = useState(draft.durationDays);
  return (
    <OnboardingStep
      step={5}
      title={t('onboarding.duration.title')}
      subtitle={t('onboarding.duration.subtitle')}
      onNext={() => {
        update({ durationDays: value });
        router.push('/time');
      }}>
      <View style={styles.list}>
        <DurationPicker value={value} onChange={setValue} />
      </View>
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({ list: { gap: spacing.xs } });
