import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { TextField } from '@/components/ui';
import type { Units } from '@/domain/types';
import { spacing } from '@/theme';

export interface BodyInputs {
  cm: string;
  ft: string;
  inch: string;
  weight: string;
}

export function BodyFields({ units, value, onChange, heightError, weightError }: { units: Units; value: BodyInputs; onChange: (v: BodyInputs) => void; heightError?: string; weightError?: string }) {
  const { t } = useTranslation();
  const set = (patch: Partial<BodyInputs>) => onChange({ ...value, ...patch });
  return (
    <View style={styles.wrap}>
      {units === 'metric' ? (
        <TextField label={t('onboarding.profile.height')} optional={t('common.optional')} value={value.cm} onChangeText={(cm) => set({ cm })} keyboardType="number-pad" suffix="cm" error={heightError} />
      ) : (
        <View style={styles.row}>
          <View style={styles.flex}>
            <TextField label={t('onboarding.profile.height')} optional={t('common.optional')} value={value.ft} onChangeText={(ft) => set({ ft })} keyboardType="number-pad" suffix={t('onboarding.profile.ft')} error={heightError} />
          </View>
          <View style={styles.flex}>
            <TextField label=" " value={value.inch} onChangeText={(inch) => set({ inch })} keyboardType="number-pad" suffix={t('onboarding.profile.in')} accessibilityLabel={`${t('onboarding.profile.height')}, ${t('onboarding.profile.in')}`} />
          </View>
        </View>
      )}
      <TextField
        label={t('onboarding.profile.weight')}
        optional={t('common.optional')}
        value={value.weight}
        onChangeText={(weight) => set({ weight })}
        keyboardType="decimal-pad"
        suffix={units === 'metric' ? 'kg' : 'lb'}
        error={weightError}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end' },
  flex: { flex: 1 },
});
