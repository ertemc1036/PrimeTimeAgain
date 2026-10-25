import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Screen, TextField } from '@/components/ui';
import { DaySwitch } from '@/features/DaySwitch';
import { parseWeight, weightToInput, weightUnit } from '@/features/units';
import { useSave } from '@/hooks/useSave';
import { useAppState } from '@/state/AppStateProvider';
import { confirm } from '@/utils/confirm';
import { newId, nowISO } from '@/utils/id';

export default function WeightEntryScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data, today } = useAppState();
  const save = useSave();
  const units = data.profile?.units ?? 'metric';
  const existing = data.weights.find((w) => w.id === id);
  const [text, setText] = useState(weightToInput(existing?.kg, units));
  const [date, setDate] = useState(existing?.date ?? today);
  const [submitted, setSubmitted] = useState(false);
  const kg = parseWeight(text, units);

  const onSave = async () => {
    setSubmitted(true);
    if (!kg) return;
    const sameDay = data.weights.find((w) => w.date === date && w.id !== existing?.id);
    const now = nowISO();
    const r = await save({ type: 'upsertWeight', entry: { id: existing?.id ?? sameDay?.id ?? newId('w'), date, kg, createdAt: existing?.createdAt ?? now, updatedAt: now } });
    if (r.ok) router.back();
  };

  const onDelete = async () => {
    if (!existing) return;
    if (!(await confirm({ title: t('privacy.confirmTitle'), message: t('privacy.confirmBody'), confirmLabel: t('common.delete'), cancelLabel: t('common.cancel'), destructive: true }))) return;
    await save({ type: 'deleteWeight', id: existing.id });
    router.back();
  };

  return (
    <Screen
      back="close"
      title={existing ? t('weight.editTitle') : t('weight.title')}
      footer={
        <>
          <Button label={t('weight.save')} onPress={() => void onSave()} />
          {existing ? <Button label={t('weight.delete')} variant="ghost" onPress={() => void onDelete()} /> : null}
        </>
      }>
      <TextField label={t('weight.value')} value={text} onChangeText={setText} keyboardType="decimal-pad" suffix={weightUnit(units)} error={submitted && !kg ? t('weight.invalid') : undefined} autoFocus />
      {existing ? null : (
        <>
          <AppText variant="label">{t('weight.date')}</AppText>
          <DaySwitch today={today} value={date} onChange={setDate} />
        </>
      )}
      <AppText variant="caption" color="secondary">
        {t('journey.weightNote')}
      </AppText>
    </Screen>
  );
}
