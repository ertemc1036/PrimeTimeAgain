import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Chip, Icon, IconButton, TextField } from '@/components/ui';
import { foodName, servingLabel } from '@/domain/foodNames';
import { getFood } from '@/domain/foods';
import { useLanguage } from '@/i18n/useLanguage';
import { freeTextItem, itemFromCustomFood, itemFromFood, searchFoods } from '@/domain/nutrition';
import type { CustomFood, FoodItem, SavedMeal } from '@/domain/types';
import { newId } from '@/utils/id';
import { colors, fonts, radii, spacing, webNoOutline } from '@/theme';

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Recalculate an item after its quantity or unit changed. Items without an estimate stay without one. */
export function rebuildItem(item: FoodItem, quantity: number, unit: string, custom: CustomFood[]): FoodItem {
  if (item.foodId?.startsWith('custom:')) {
    const cf = custom.find((c) => `custom:${c.id}` === item.foodId);
    if (cf) return itemFromCustomFood(item.id, cf, quantity);
  } else if (item.foodId) {
    const rebuilt = itemFromFood(item.id, item.foodId, quantity, unit);
    if (rebuilt) return { ...rebuilt, name: item.name };
  }
  if (item.nutrition && item.quantity > 0 && unit === item.unit) {
    const f = quantity / item.quantity;
    const n = item.nutrition;
    return { ...item, quantity, nutrition: { kcal: Math.round(n.kcal * f), protein: round1(n.protein * f), carbs: round1(n.carbs * f), fat: round1(n.fat * f) }, grams: item.grams ? Math.round(item.grams * f) : undefined };
  }
  return { ...freeTextItem(item.id, item.name, quantity, unit) };
}

const unitsFor = (item: FoodItem): string[] => {
  if (!item.foodId || item.foodId.startsWith('custom:')) return [item.unit];
  const food = getFood(item.foodId);
  if (!food) return [item.unit];
  return [...food.servings.map((s) => s.label), food.liquid ? 'ml' : 'g'];
};

export function ItemsEditor({
  items,
  onChange,
  customFoods,
  savedMeals = [],
  onUseSavedMeal,
}: {
  items: FoodItem[];
  onChange: (items: FoodItem[]) => void;
  customFoods: CustomFood[];
  savedMeals?: SavedMeal[];
  onUseSavedMeal?: (meal: SavedMeal) => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const lang = useLanguage();
  const results = useMemo(() => (query.trim() ? searchFoods(query, customFoods, 6, lang) : null), [query, customFoods, lang]);
  const recent = useMemo(
    () => [...savedMeals].sort((a, b) => Number(b.favorite) - Number(a.favorite) || (a.lastUsedAt < b.lastUsedAt ? 1 : -1)).slice(0, 6),
    [savedMeals],
  );

  const add = (item: FoodItem | null) => {
    if (!item) return;
    onChange([...items, item]);
    setQuery('');
  };

  return (
    <View style={styles.wrap}>
      <AppText variant="subheading">{t('items.title')}</AppText>
      {items.length === 0 ? (
        <AppText variant="caption" color="secondary">
          {t('items.empty')}
        </AppText>
      ) : (
        items.map((item, idx) => (
          <ItemRow
            key={item.id}
            item={item}
            onChange={(next) => onChange(items.map((x, i) => (i === idx ? next : x)))}
            onRemove={() => onChange(items.filter((_, i) => i !== idx))}
            customFoods={customFoods}
          />
        ))
      )}
      <TextField label={t('items.search')} placeholder={t('items.searchPlaceholder')} value={query} onChangeText={setQuery} autoCorrect={false} returnKeyType="search" />
      {results ? (
        <View style={styles.results}>
          {results.custom.map((c) => (
            <ResultRow key={c.id} name={c.name} detail={`${c.servingLabel} · ${t('common.kcal', { value: Math.round(c.perServing.kcal) })}`} onPress={() => add(itemFromCustomFood(newId('item'), c, 1))} />
          ))}
          {results.foods.map((f) => {
            const s = f.servings[0];
            return (
              <ResultRow
                key={f.id}
                name={foodName(f, lang)}
                detail={`${servingLabel(s.label, lang)} · ${t('common.kcal', { value: Math.round((f.per100g.kcal * s.grams) / 100) })}`}
                onPress={() => add(itemFromFood(newId('item'), f.id, 1, s.label, lang))}
              />
            );
          })}
          <ResultRow name={t('items.addAsText', { name: query.trim() })} detail={t('items.noEstimate')} icon="create-outline" onPress={() => add(freeTextItem(newId('item'), query, 1, t('common.portion')))} />
        </View>
      ) : null}
      <Pressable onPress={() => router.push('/custom-food')} accessibilityRole="button" style={styles.link}>
        <Icon name="add-circle-outline" size={20} />
        <AppText variant="bodyStrong">{t('items.createCustom')}</AppText>
      </Pressable>
      {!results && recent.length && onUseSavedMeal ? (
        <View style={styles.recent}>
          <AppText variant="label" color="secondary">
            {t('items.recent')}
          </AppText>
          <View style={styles.chips}>
            {recent.map((m) => (
              <Chip key={m.id} label={m.title} selected={false} icon={m.favorite ? 'star' : 'time-outline'} onPress={() => onUseSavedMeal(m)} />
            ))}
          </View>
        </View>
      ) : null}
      {items.length ? (
        <AppText variant="caption" color="secondary">
          {t('items.estimateNote')}
        </AppText>
      ) : null}
    </View>
  );
}

function ResultRow({ name, detail, onPress, icon = 'add' }: { name: string; detail: string; onPress: () => void; icon?: 'add' | 'create-outline' }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${name}, ${detail}`} style={({ pressed }) => [styles.result, pressed && styles.pressed]}>
      <View style={styles.flex}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {name}
        </AppText>
        <AppText variant="caption" color="secondary">
          {detail}
        </AppText>
      </View>
      <Icon name={icon} size={22} />
    </Pressable>
  );
}

function ItemRow({ item, onChange, onRemove, customFoods }: { item: FoodItem; onChange: (i: FoodItem) => void; onRemove: () => void; customFoods: CustomFood[] }) {
  const { t } = useTranslation();
  const lang = useLanguage();
  const [qty, setQty] = useState(String(item.quantity));
  const units = unitsFor(item);
  const update = (text: string, unit = item.unit) => {
    setQty(text);
    const n = Number(text.replace(',', '.'));
    if (n > 0 && n <= 5000) onChange(rebuildItem(item, n, unit, customFoods));
  };
  return (
    <View style={styles.item}>
      <View style={styles.itemHead}>
        <View style={styles.flex}>
          <AppText variant="bodyStrong">{item.name}</AppText>
          <AppText variant="caption" color="secondary">
            {item.nutrition
              ? `${t('common.kcal', { value: item.nutrition.kcal })} · ${t('items.macros', { p: item.nutrition.protein, c: item.nutrition.carbs, f: item.nutrition.fat })}`
              : t('items.noEstimate')}
          </AppText>
        </View>
        <IconButton icon="close" label={t('items.remove', { name: item.name })} onPress={onRemove} variant="plain" />
      </View>
      <View style={styles.qtyRow}>
        <TextInput
          value={qty}
          onChangeText={(v) => update(v)}
          keyboardType="decimal-pad"
          accessibilityLabel={`${t('items.quantity')}, ${item.name}`}
          style={[styles.qty, webNoOutline]}
          selectTextOnFocus
        />
        <View style={styles.units}>
          {units.map((u) => (
            <Chip key={u} label={servingLabel(u, lang)} selected={u === item.unit} mode="radio" onPress={() => update(qty, u)} />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  flex: { flex: 1, gap: 2 },
  results: { backgroundColor: colors.white, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  result: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, minHeight: 56, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  pressed: { backgroundColor: colors.card },
  link: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 44 },
  recent: { gap: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  item: { backgroundColor: colors.card, borderRadius: radii.md, padding: spacing.md, gap: spacing.sm },
  itemHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  qty: { width: 72, minHeight: 44, borderRadius: radii.sm, backgroundColor: colors.white, textAlign: 'center', fontFamily: fonts.semibold, fontSize: 16, color: colors.text },
  units: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, flex: 1 },
});
