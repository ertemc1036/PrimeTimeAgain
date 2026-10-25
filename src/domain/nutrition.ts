import { foodName, type FoodLang } from './foodNames';
import { FOODS, getFood, type FoodRef, type Serving } from './foods';
import type { CustomFood, FoodItem, Macros } from './types';

const round1 = (n: number) => Math.round(n * 10) / 10;

export const scaleMacros = (per100g: Macros, grams: number): Macros => ({
  kcal: Math.round((per100g.kcal * grams) / 100),
  protein: round1((per100g.protein * grams) / 100),
  carbs: round1((per100g.carbs * grams) / 100),
  fat: round1((per100g.fat * grams) / 100),
});

/** Grams for a quantity of a database food in grams/ml or in one of its servings. */
export function gramsFor(food: FoodRef, quantity: number, unit: string): number | null {
  if (!(quantity > 0)) return null;
  if (unit === 'g' || unit === 'ml') return quantity;
  const serving = food.servings.find((s: Serving) => s.label === unit);
  return serving ? quantity * serving.grams : null;
}

/** Build an item from the reference database. Unknown units produce no estimate rather than a guess. */
export function itemFromFood(id: string, foodId: string, quantity: number, unit: string, lang: FoodLang = 'en'): FoodItem | null {
  const food = getFood(foodId);
  if (!food) return null;
  const grams = gramsFor(food, quantity, unit);
  return {
    id,
    foodId,
    name: foodName(food, lang),
    quantity,
    unit,
    grams: grams ?? undefined,
    nutrition: grams === null ? null : scaleMacros(food.per100g, grams),
  };
}

export function itemFromCustomFood(id: string, food: CustomFood, servings: number): FoodItem {
  return {
    id,
    foodId: `custom:${food.id}`,
    name: food.name,
    quantity: servings,
    unit: food.servingLabel,
    grams: food.servingGrams ? food.servingGrams * servings : undefined,
    nutrition: {
      kcal: Math.round(food.perServing.kcal * servings),
      protein: round1(food.perServing.protein * servings),
      carbs: round1(food.perServing.carbs * servings),
      fat: round1(food.perServing.fat * servings),
    },
  };
}

/** A free-text item the user typed: kept as written, without inventing nutrition. */
export const freeTextItem = (id: string, name: string, quantity: number, unit: string): FoodItem => ({
  id,
  name: name.trim(),
  quantity,
  unit,
  nutrition: null,
});

export interface NutritionTotals extends Macros {
  /** Number of items that contributed an estimate. */
  estimated: number;
  /** Items without an estimate (shown as "estimate unavailable" rather than zero). */
  missing: number;
}

export function totals(items: FoodItem[]): NutritionTotals {
  const t: NutritionTotals = { kcal: 0, protein: 0, carbs: 0, fat: 0, estimated: 0, missing: 0 };
  for (const i of items) {
    if (!i.nutrition) {
      t.missing++;
      continue;
    }
    t.estimated++;
    t.kcal += i.nutrition.kcal;
    t.protein += i.nutrition.protein;
    t.carbs += i.nutrition.carbs;
    t.fat += i.nutrition.fat;
  }
  return { ...t, kcal: Math.round(t.kcal), protein: round1(t.protein), carbs: round1(t.carbs), fat: round1(t.fat) };
}

/** Simple search over built-in and custom foods: prefix and word matches rank first. */
/** Matches the food's name in the app language and in English, so either works when searching. */
export function searchFoods(query: string, custom: CustomFood[] = [], limit = 20, lang: FoodLang = 'en') {
  const q = query.trim().toLowerCase();
  if (!q) return { foods: FOODS.slice(0, limit), custom: custom.slice(0, limit) };
  const tokens = q.split(/[\s,]+/).filter(Boolean);
  const score = (name: string) => {
    const n = name.toLowerCase();
    const words = n.split(/[\s,()%]+/);
    if (n.startsWith(q)) return 0;
    // Every typed word matches the start of a word, in any order ("rice white" → "Rice, white, cooked").
    if (tokens.every((tk) => words.some((w) => w.startsWith(tk)))) return 1;
    if (n.includes(q)) return 2;
    if (tokens.every((tk) => n.includes(tk))) return 3;
    return 99;
  };
  return {
    foods: FOODS.map((f) => ({ f, s: Math.min(score(foodName(f, lang)), score(f.name)) }))
      .filter((x) => x.s < 99)
      .sort((a, b) => a.s - b.s || foodName(a.f, lang).localeCompare(foodName(b.f, lang)))
      .slice(0, limit)
      .map((x) => x.f),
    custom: custom.filter((c) => score(c.name) < 99).slice(0, limit),
  };
}
