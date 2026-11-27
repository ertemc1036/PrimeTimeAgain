import { addDays } from './dates';
import { totals, type NutritionTotals } from './nutrition';
import type { AppData, ISODate, PlannedActivity, PlannedMeal, WorkoutType } from './types';

/** Default daily water guide value (ml) when the profile has none. */
export const DEFAULT_WATER_GOAL_ML = 2000;

export interface KitchenDay {
  /** Nutrition of everything logged on the day (estimates; items without values are counted in `missing`). */
  nutrition: NutritionTotals;
  mealsLogged: number;
  /** Planned meals for the day that have not been logged from the plan yet. */
  openMeals: PlannedMeal[];
  mealsPlanned: number;
}

export interface GymDay {
  sessions: number;
  minutes: number;
  types: WorkoutType[];
  rest: boolean;
  planned: PlannedActivity | null;
}

export interface WaterDay {
  ml: number;
  goalMl: number;
}

/** What was eaten and what is still planned on `date` (Kitchen tab, Today summary). */
export function kitchenDay(data: AppData, date: ISODate): KitchenDay {
  const logs = data.foodLogs.filter((f) => f.date === date);
  const used = new Set(logs.map((f) => f.planMealId).filter(Boolean));
  const planned = data.plans[date]?.meals ?? [];
  return { nutrition: totals(logs.flatMap((f) => f.items)), mealsLogged: logs.length, openMeals: planned.filter((m) => !used.has(m.id)), mealsPlanned: planned.length };
}

/** Training logged and planned on `date` (Gym tab, Today summary). */
export function gymDay(data: AppData, date: ISODate): GymDay {
  const logs = data.activityLogs.filter((a) => a.date === date);
  return {
    sessions: logs.length,
    minutes: logs.reduce((s, a) => s + a.durationMin, 0),
    types: [...new Set(logs.map((a) => a.type))],
    rest: !!data.recoveryLogs[date],
    planned: data.plans[date]?.activity ?? null,
  };
}

export function waterDay(data: AppData, date: ISODate): WaterDay {
  return { ml: data.water.filter((w) => w.date === date).reduce((s, w) => s + w.ml, 0), goalMl: data.profile?.waterGoalMl ?? DEFAULT_WATER_GOAL_ML };
}

export interface TrainingWeek {
  /** Days with at least one session in the 7 days ending on `today`. */
  activeDays: number;
  sessions: number;
  minutes: number;
  /** Sessions per training type, most frequent first. */
  byType: { type: WorkoutType; sessions: number; minutes: number }[];
  /** Sessions per day, oldest first (7 entries, last = today). */
  perDay: { date: ISODate; minutes: number; rest: boolean }[];
}

/** Training overview of the last 7 days (Gym tab). */
export function trainingWeek(data: AppData, today: ISODate): TrainingWeek {
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const inRange = new Set(days);
  const logs = data.activityLogs.filter((a) => inRange.has(a.date));
  const byType = new Map<WorkoutType, { sessions: number; minutes: number }>();
  for (const a of logs) {
    const v = byType.get(a.type) ?? { sessions: 0, minutes: 0 };
    byType.set(a.type, { sessions: v.sessions + 1, minutes: v.minutes + a.durationMin });
  }
  return {
    activeDays: new Set(logs.map((a) => a.date)).size,
    sessions: logs.length,
    minutes: logs.reduce((s, a) => s + a.durationMin, 0),
    byType: [...byType.entries()].map(([type, v]) => ({ type, ...v })).sort((a, b) => b.sessions - a.sessions || b.minutes - a.minutes),
    perDay: days.map((date) => ({ date, minutes: logs.filter((a) => a.date === date).reduce((s, a) => s + a.durationMin, 0), rest: !!data.recoveryLogs[date] })),
  };
}
