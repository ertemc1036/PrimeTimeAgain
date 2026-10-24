import { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { SelectCard, Stepper } from '@/components/ui';
import { MAX_DAILY_MINUTES, MIN_DAILY_MINUTES, MINUTE_OPTIONS } from '@/domain/program';
import { spacing } from '@/theme';

export function TimePicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const { t } = useTranslation();
  const isPreset = (MINUTE_OPTIONS as readonly number[]).includes(value);
  const [custom, setCustom] = useState(!isPreset);
  return (
    <View style={{ gap: spacing.xs }} accessibilityRole="radiogroup">
      {MINUTE_OPTIONS.map((m) => (
        <SelectCard
          key={m}
          mode="radio"
          title={m === 90 ? t('onboarding.time.plus', { count: m }) : t('common.minutes', { count: m })}
          description={t(`onboarding.time.hints.${m}`)}
          selected={!custom && value === m}
          onPress={() => {
            setCustom(false);
            onChange(m);
          }}
        />
      ))}
      <SelectCard mode="radio" title={t('common.custom')} selected={custom} onPress={() => setCustom(true)} />
      {custom ? (
        <Stepper
          label={t('common.custom')}
          value={value}
          display={t('common.minutes', { count: value })}
          onChange={onChange}
          step={5}
          min={MIN_DAILY_MINUTES}
          max={MAX_DAILY_MINUTES}
          decreaseLabel={t('onboarding.time.decrease')}
          increaseLabel={t('onboarding.time.increase')}
        />
      ) : null}
    </View>
  );
}
