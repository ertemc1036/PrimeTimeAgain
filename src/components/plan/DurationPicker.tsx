import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { SelectCard, Stepper } from '@/components/ui';
import { DEFAULT_DURATION, DURATION_OPTIONS, MAX_DURATION } from '@/domain/program';
import { spacing } from '@/theme';

export function DurationPicker({ value, onChange, min = 14 }: { value: number; onChange: (v: number) => void; min?: number }) {
  const { t } = useTranslation();
  const isPreset = (DURATION_OPTIONS as readonly number[]).includes(value);
  const [custom, setCustom] = useState(!isPreset);
  return (
    <View style={{ gap: spacing.xs }} accessibilityRole="radiogroup">
      {DURATION_OPTIONS.map((d) => (
        <SelectCard
          key={d}
          mode="radio"
          title={t('common.days', { count: d })}
          description={t(`onboarding.duration.d${d}`)}
          badge={d === DEFAULT_DURATION ? t('common.recommended') : undefined}
          selected={!custom && value === d}
          disabled={d < min}
          onPress={() => {
            setCustom(false);
            onChange(d);
          }}
        />
      ))}
      <SelectCard
        mode="radio"
        title={t('common.custom')}
        description={t('onboarding.duration.custom')}
        selected={custom}
        onPress={() => setCustom(true)}
      />
      {custom ? (
        <Stepper
          label={t('onboarding.duration.custom')}
          value={value}
          display={t('common.days', { count: value })}
          onChange={onChange}
          step={5}
          min={min}
          max={MAX_DURATION}
          decreaseLabel={t('onboarding.duration.decrease')}
          increaseLabel={t('onboarding.duration.increase')}
        />
      ) : null}
    </View>
  );
}
