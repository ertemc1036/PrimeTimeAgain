import type { AppData, DayPlan, ISODate, PlannedMeal } from '@/domain/types';
import { newId, nowISO } from '@/utils/id';

export const emptyPlan = (date: ISODate): DayPlan => ({ date, meals: [], flexibleMeals: false, activity: null, updatedAt: nowISO() });

/** The plan with one meal added, replaced or removed (keeps everything else, including saved state). */
export function withMeal(data: AppData, date: ISODate, meal: PlannedMeal | null, removeId?: string): DayPlan {
  const base = data.plans[date] ?? emptyPlan(date);
  let meals = base.meals.filter((m) => m.id !== (removeId ?? meal?.id));
  if (meal) {
    const idx = base.meals.findIndex((m) => m.id === meal.id);
    meals = idx >= 0 ? base.meals.map((m) => (m.id === meal.id ? meal : m)) : [...base.meals, meal];
  }
  return { ...base, meals, flexibleMeals: meals.length ? false : base.flexibleMeals, updatedAt: nowISO() };
}

/** Most recent earlier plan that has meals, for "Copy a previous day". */
export function previousPlanWithMeals(data: AppData, date: ISODate): DayPlan | undefined {
  return Object.values(data.plans)
    .filter((p) => p.date < date && p.meals.length > 0)
    .sort((a, b) => (a.date < b.date ? 1 : -1))[0];
}

export const cloneMeals = (meals: PlannedMeal[]): PlannedMeal[] =>
  meals.map((m) => ({ ...m, id: newId('pm'), items: m.items.map((i) => ({ ...i, id: newId('item') })) }));
