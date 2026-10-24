import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { BOUNDS, fromDisplay, unitFor } from '@/components/evolution/units';
import { AppText, Button, Chip, Screen, TextField } from '@/components/ui';
import { newId } from '@/domain/plan';
import { useAppState } from '@/state/AppStateProvider';
import { spacing } from '@/theme';

type BodyMetric = 'weight' | 'waist';

export default function MeasurementScreen() {
  const params = useLocalSearchParams<{ metric?: string }>();
  const { t } = useTranslation();
  const { data, today, dispatch } = useAppState();
  const [metric, setMetric] = useState<BodyMetric>(params.metric === 'waist' ? 'waist' : 'weight');
  const [raw, setRaw] = useState('');
  const [error, setError] = useState<string | null>(null);
  const units = data.preferences.units;
  const unit = unitFor(metric, units)!;

  const save = async () => {
    const value = fromDisplay(metric, Number(raw.replace(',', '.')), units);
    const [min, max] = BOUNDS[metric];
    if (!Number.isFinite(value) || value < min || value > max) {
      setError(t('metric.invalid'));
      return;
    }
    await dispatch({ type: 'addMeasurement', measurement: { id: newId('m'), date: today, metric, value, createdAt: new Date().toISOString() } }).catch(() => undefined);
    router.back();
  };

  return (
    <Screen back="close" title={t('metric.title')} footer={<Button label={t('common.save')} onPress={save} disabled={!raw} />}>
      <View style={styles.group}>
        <AppText variant="subheading">{t('metric.metric')}</AppText>
        <View style={styles.chips} accessibilityRole="radiogroup">
          {(['weight', 'waist'] as const).map((m) => (
            <Chip key={m} mode="radio" label={t(`evolution.${m}`)} selected={metric === m} onPress={() => setMetric(m)} />
          ))}
        </View>
      </View>
      <TextField
        label={`${t('metric.value')} (${t(`metric.${unit}` as 'metric.kg')})`}
        value={raw}
        onChangeText={(v) => {
          setRaw(v.replace(/[^0-9.,]/g, ''));
          setError(null);
        }}
        keyboardType="decimal-pad"
        maxLength={6}
        error={error ?? undefined}
        autoFocus
      />
      <AppText variant="caption" color="secondary">
        {t('metric.note')}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
