import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Screen, TextField } from '@/components/ui';
import { parseNum } from '@/features/units';
import { useSave } from '@/hooks/useSave';
import { newId } from '@/utils/id';

export default function CustomFood() {
  const { t } = useTranslation();
  const save = useSave();
  const [f, setF] = useState({ name: '', serving: '', grams: '', kcal: '', protein: '', carbs: '', fat: '' });
  const [error, setError] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v });

  const onSave = async () => {
    const kcal = parseNum(f.kcal);
    const protein = parseNum(f.protein) ?? 0;
    const carbs = parseNum(f.carbs) ?? 0;
    const fat = parseNum(f.fat) ?? 0;
    const valid = f.name.trim() && kcal !== undefined && kcal >= 0 && kcal < 5000 && [protein, carbs, fat].every((n) => n >= 0 && n < 500);
    if (!valid) return setError(true);
    const r = await save({
      type: 'upsertCustomFood',
      food: { id: newId('cf'), name: f.name.trim().slice(0, 60), servingLabel: f.serving.trim() || t('customFood.defaultServing'), servingGrams: parseNum(f.grams), perServing: { kcal: kcal!, protein, carbs, fat } },
    });
    if (r.ok) router.back();
  };

  return (
    <Screen back="close" title={t('customFood.title')} subtitle={t('customFood.hint')} footer={<Button label={t('common.save')} onPress={() => void onSave()} />}>
      <TextField label={t('customFood.name')} value={f.name} onChangeText={set('name')} maxLength={60} />
      <TextField label={t('customFood.serving')} placeholder={t('customFood.servingPlaceholder')} value={f.serving} onChangeText={set('serving')} maxLength={30} />
      <TextField label={t('customFood.servingGrams')} optional={t('common.optional')} value={f.grams} onChangeText={set('grams')} keyboardType="decimal-pad" />
      <TextField label={t('customFood.kcal')} value={f.kcal} onChangeText={set('kcal')} keyboardType="decimal-pad" />
      <TextField label={t('customFood.protein')} value={f.protein} onChangeText={set('protein')} keyboardType="decimal-pad" />
      <TextField label={t('customFood.carbs')} value={f.carbs} onChangeText={set('carbs')} keyboardType="decimal-pad" />
      <TextField label={t('customFood.fat')} value={f.fat} onChangeText={set('fat')} keyboardType="decimal-pad" />
      {error ? <AppText variant="bodyStrong">{t('customFood.invalid')}</AppText> : null}
    </Screen>
  );
}
