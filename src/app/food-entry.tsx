import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Card, Chip, Screen, TextField, TimeField, ToggleRow, useToast } from '@/components/ui';
import { canEditCheckIns } from '@/domain/completion';
import { isWithinWindow, nowTime } from '@/domain/dates';
import { totals } from '@/domain/nutrition';
import { MEAL_TYPES, type FoodItem, type FoodLog, type MealType } from '@/domain/types';
import { validateFood } from '@/domain/validation';
import { ItemsEditor } from '@/features/ItemsEditor';
import { mealLabel } from '@/features/labels';
import { NutritionSummary } from '@/features/NutritionSummary';
import { useSave } from '@/hooks/useSave';
import { useAppState } from '@/state/AppStateProvider';
import { takeScan } from '@/state/handoff';
import { spacing } from '@/theme';
import { confirm } from '@/utils/confirm';
import { localDateTime, newId, nowISO } from '@/utils/id';

const guessMeal = (time: string): MealType => {
  const h = Number(time.slice(0, 2));
  return h < 11 ? 'breakfast' : h < 15 ? 'lunch' : h < 17 ? 'snack' : 'dinner';
};

export default function FoodEntry() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ id?: string; date?: string; planMealId?: string; mealType?: MealType; fromScan?: string }>();
  const { data, today } = useAppState();
  const save = useSave();
  const toast = useToast();

  const existing = data.foodLogs.find((f) => f.id === params.id);
  const date = existing?.date ?? params.date ?? today;
  const planned = params.planMealId ? data.plans[date]?.meals.find((m) => m.id === params.planMealId) : undefined;
  const [scan] = useState(() => (params.fromScan ? takeScan() : undefined));
  const [initialTime] = useState(() => existing?.time ?? planned?.time ?? nowTime());

  const [title, setTitle] = useState(existing?.title ?? planned?.title ?? scan?.title ?? '');
  const [mealType, setMealType] = useState<MealType>(existing?.mealType ?? planned?.mealType ?? params.mealType ?? guessMeal(initialTime));
  const [time, setTime] = useState(initialTime);
  const [items, setItems] = useState<FoodItem[]>(() => (existing?.items ?? planned?.items ?? scan?.items ?? []).map((i) => ({ ...i })));
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [favorite, setFavorite] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const aiEstimated = existing?.aiEstimated ?? !!scan;
  const editable = canEditCheckIns(date, today);

  const onSave = async () => {
    const name = title.trim() || items[0]?.name || '';
    const v = validateFood({ title: name, mealType, time, quantity: 1 });
    if (!v.ok) {
      setErrors(Object.fromEntries(Object.entries(v.errors).map(([k, msg]) => [k, t(msg as 'validation.foodName')])));
      return;
    }
    const win = data.eatingWindow;
    const outsideWindow = win.enabled && !isWithinWindow(time, win.start, win.end);
    const now = nowISO();
    const log: FoodLog = {
      id: existing?.id ?? newId('food'),
      date,
      consumedAt: localDateTime(date, time),
      time,
      mealType,
      title: name.slice(0, 80),
      items,
      notes: notes.trim() || undefined,
      entryMethod: existing?.entryMethod ?? (scan ? 'ai' : planned ? 'plan' : 'manual'),
      planMealId: existing?.planMealId ?? planned?.id,
      aiEstimated: aiEstimated || undefined,
      outsideWindow: outsideWindow || undefined,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    const r = await save({ type: 'upsertFood', log });
    if (!r.ok) return;
    if (favorite) await save({ type: 'upsertSavedMeal', meal: { id: newId('sm'), title: log.title, mealType, items, favorite: true, lastUsedAt: now } });
    // Eating windows are informational only: the meal is always saved.
    toast(outsideWindow ? t('food.outsideWindow') : t('foodEntry.saved'), outsideWindow ? 'information-circle-outline' : 'checkmark-circle');
    router.back();
  };

  const onDelete = async () => {
    if (!existing) return;
    const ok = await confirm({ title: t('foodEntry.deleteTitle'), message: t('foodEntry.deleteBody'), confirmLabel: t('common.delete'), cancelLabel: t('common.cancel'), destructive: true });
    if (!ok) return;
    const r = await save({ type: 'deleteFood', id: existing.id }, t('foodEntry.deleted'));
    if (r.ok) router.back();
  };

  return (
    <Screen
      back="close"
      title={existing ? t('foodEntry.editTitle') : t('foodEntry.title')}
      footer={
        editable ? (
          <>
            <Button label={t('foodEntry.save')} onPress={() => void onSave()} />
            {existing ? <Button label={t('foodEntry.delete')} variant="ghost" onPress={() => void onDelete()} /> : null}
          </>
        ) : undefined
      }>
      {!editable ? (
        <Card>
          <AppText variant="body">{t('food.locked')}</AppText>
        </Card>
      ) : null}
      {planned && !existing ? (
        <AppText variant="body" color="secondary">
          {t('foodEntry.fromPlan', { name: planned.title })}
        </AppText>
      ) : null}
      {aiEstimated ? (
        <Card>
          <AppText variant="bodyStrong">{t('scan.result')}</AppText>
          <AppText variant="caption">{t('scan.resultNote')}</AppText>
        </Card>
      ) : null}
      <TextField label={t('foodEntry.name')} placeholder={items[0]?.name ?? t('foodEntry.namePlaceholder')} value={title} onChangeText={(v) => { setTitle(v); setErrors((e) => ({ ...e, title: undefined })); }} maxLength={80} error={errors.title} />
      <View style={styles.group}>
        <AppText variant="label">{t('foodEntry.mealType')}</AppText>
        <View style={styles.chips}>
          {MEAL_TYPES.map((m) => (
            <Chip key={m} mode="radio" label={mealLabel(t, m, true)} selected={m === mealType} onPress={() => setMealType(m)} />
          ))}
        </View>
      </View>
      <TimeField label={t('foodEntry.time')} value={time} onChange={setTime} error={errors.time} />
      <ItemsEditor
        items={items}
        onChange={setItems}
        customFoods={data.customFoods}
        savedMeals={data.savedMeals}
        onUseSavedMeal={(m) => {
          setTitle(m.title);
          if (m.mealType) setMealType(m.mealType);
          setItems(m.items.map((i) => ({ ...i, id: newId('item') })));
          void save({ type: 'upsertSavedMeal', meal: { ...m, lastUsedAt: nowISO() } });
        }}
      />
      {items.length ? <NutritionSummary totals={totals(items)} /> : null}
      <TextField label={t('foodEntry.notes')} optional={t('common.optional')} value={notes} onChangeText={setNotes} multiline maxLength={300} />
      <Card variant="outline" padded={false}>
        <ToggleRow label={t('foodEntry.favorite')} value={favorite} onChange={setFavorite} divider={false} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
