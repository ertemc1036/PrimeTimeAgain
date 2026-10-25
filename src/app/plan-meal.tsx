import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, Chip, Screen, TextField, ToggleRow, Card } from '@/components/ui';
import { MEAL_TYPES, type FoodItem, type MealType } from '@/domain/types';
import { ItemsEditor } from '@/features/ItemsEditor';
import { mealLabel } from '@/features/labels';
import { withMeal } from '@/features/plan';
import { useSave } from '@/hooks/useSave';
import { useAppState } from '@/state/AppStateProvider';
import { spacing } from '@/theme';
import { newId, nowISO } from '@/utils/id';
import { parseTime } from '@/domain/dates';

export default function PlanMeal() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ date: string; mealType?: MealType; id?: string }>();
  const { data } = useAppState();
  const save = useSave();
  const date = params.date;
  const existing = data.plans[date]?.meals.find((m) => m.id === params.id);
  const [mealType, setMealType] = useState<MealType>(existing?.mealType ?? params.mealType ?? 'breakfast');
  const [title, setTitle] = useState(existing?.title ?? '');
  const [items, setItems] = useState<FoodItem[]>(existing?.items ?? []);
  const [time, setTime] = useState(existing?.time ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [favorite, setFavorite] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const name = title.trim() || items[0]?.name || '';
  const timeOk = !time || parseTime(time) !== null;

  const onSave = async () => {
    setSubmitted(true);
    if (!name || !timeOk) return;
    const meal = { id: existing?.id ?? newId('pm'), mealType, title: name.slice(0, 80), items, time: time || undefined, notes: notes.trim() || undefined };
    const r = await save({ type: 'savePlan', plan: withMeal(data, date, meal) });
    if (r.ok && favorite) await save({ type: 'upsertSavedMeal', meal: { id: newId('sm'), title: meal.title, mealType, items, favorite: true, lastUsedAt: nowISO() } });
    if (r.ok) router.back();
  };

  const onRemove = async () => {
    if (!existing) return;
    const r = await save({ type: 'savePlan', plan: withMeal(data, date, null, existing.id) });
    if (r.ok) router.back();
  };

  return (
    <Screen
      back="close"
      title={existing ? t('planMeal.editTitle', { meal: mealLabel(t, mealType, true) }) : t('planMeal.title', { meal: mealLabel(t, mealType, true) })}
      footer={
        <>
          <Button label={t('common.save')} onPress={() => void onSave()} />
          {existing ? <Button label={t('planMeal.remove')} variant="ghost" onPress={() => void onRemove()} /> : null}
        </>
      }>
      <View style={styles.chips}>
        {MEAL_TYPES.map((m) => (
          <Chip key={m} mode="radio" label={mealLabel(t, m, true)} selected={m === mealType} onPress={() => setMealType(m)} />
        ))}
      </View>
      <TextField
        label={t('planMeal.name')}
        placeholder={items[0]?.name ?? t('planMeal.namePlaceholder')}
        value={title}
        onChangeText={setTitle}
        maxLength={80}
        error={submitted && !name ? t('validation.foodName') : undefined}
      />
      <ItemsEditor
        items={items}
        onChange={setItems}
        customFoods={data.customFoods}
        savedMeals={data.savedMeals}
        onUseSavedMeal={(m) => {
          setTitle(m.title);
          setItems(m.items.map((i) => ({ ...i, id: newId('item') })));
        }}
      />
      <TextField label={t('planMeal.time')} optional={t('common.optional')} placeholder="HH:MM" value={time} onChangeText={setTime} keyboardType="numbers-and-punctuation" maxLength={5} error={timeOk ? undefined : t('validation.time')} />
      <TextField label={t('planMeal.notes')} optional={t('common.optional')} value={notes} onChangeText={setNotes} multiline maxLength={300} />
      <Card variant="outline" padded={false}>
        <ToggleRow label={t('planMeal.saveFavorite')} value={favorite} onChange={setFavorite} divider={false} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({ chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs } });
