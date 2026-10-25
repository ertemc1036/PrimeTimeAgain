import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Chip, TimeField } from '@/components/ui';
import { parseTime } from '@/domain/dates';
import { useOnboarding } from '@/features/onboarding/draft';
import { OnboardingStep } from '@/features/onboarding/OnboardingStep';
import { spacing } from '@/theme';

const PRESETS = ['19:00', '20:00', '20:30', '21:00', '21:30'];

export default function PlanningTimeStep() {
  const { t } = useTranslation();
  const { draft, update } = useOnboarding();
  const [time, setTime] = useState(draft.planningTime);
  const valid = parseTime(time) !== null;
  return (
    <OnboardingStep
      step={5}
      title={t('onboarding.planning.title')}
      subtitle={t('onboarding.planning.subtitle')}
      disabled={!valid}
      onContinue={() => {
        update({ planningTime: time });
        router.push('/notifications');
      }}>
      <TimeField label={t('onboarding.planning.time')} value={time} onChange={setTime} error={valid ? undefined : t('validation.time')} />
      <View style={styles.chips}>
        {PRESETS.map((p) => (
          <Chip key={p} label={p} selected={p === time} mode="radio" onPress={() => setTime(p)} />
        ))}
      </View>
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({ chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs } });
