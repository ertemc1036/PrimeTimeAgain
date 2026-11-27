import { addDays, daysBetween } from './dates';
import type { AppData, DayPlan, ISODate } from './types';

/**
 * PrimeMe AI daily routine rules — the one authoritative implementation. Every screen, statistic,
 * reminder, milestone and Prime summary reads the day status from here.
 *
 * A day D is COMPLETE when both are true:
 *  1. Food:     at least one meal is logged for D AND the food log for D is confirmed as finished.
 *  2. Activity: a saved workout / activity (manual, via Prime or with a photo) OR a saved Rest Day.
 *
 * Planning the next day is optional: it never counts towards, blocks or lowers a day (see
 * isPlanComplete for the optional "tomorrow planned" hint). Completion is derived from the saved
 * entries every time – nothing is stored – so a corrected entry updates the day immediately, and a
 * day can only be counted once. The rule judges the routine of documenting, never food quality,
 * calories or weight.
 *
 * Late-entry grace: check-ins for D can be added or corrected on D and on D+1 (until 23:59 local).
 * Older days are read-only so the history (and achievements) stay accurate.
 * Dates are the user's local calendar dates, so midnight, time zones and DST never split a day.
 */
export const GRACE_DAYS = 1;

/** Number of daily tasks that make up a complete day. */
export const DAILY_TASKS = 2;

export type FoodStatus = 'open' | 'inProgress' | 'done';
export type ActivityStatus = 'open' | 'trained' | 'rest';

export interface DayChecks {
  food: boolean;
  /** open = nothing logged · inProgress = meals logged, diary not finished yet · done. */
  foodStatus: FoodStatus;
  activity: boolean;
  /** open · trained (a workout or activity exists) · rest (a Rest Day, no workout). */
  activityStatus: ActivityStatus;
  /** Tasks done (0–2). */
  done: number;
  complete: boolean;
}

export type CalendarStatus = 'complete' | 'partial' | 'incomplete' | 'today' | 'future' | 'before';

export const isPlanComplete = (plan: DayPlan | undefined): boolean => {
  if (!plan?.savedAt) return false;
  const meals = plan.flexibleMeals || plan.meals.length > 0;
  const a = plan.activity;
  const activity = !!a && (a.type === 'rest' || (!!a.time && !!a.durationMin && a.durationMin > 0));
  return meals && activity;
};

export const canEditCheckIns = (date: ISODate, today: ISODate): boolean => {
  const age = daysBetween(date, today);
  return age >= 0 && age <= GRACE_DAYS;
};

/** Plans can be created or edited for today and any future date. */
export const canEditPlan = (date: ISODate, today: ISODate): boolean => daysBetween(today, date) >= 0;

export function dayChecks(data: AppData, date: ISODate): DayChecks {
  const meals = data.foodLogs.some((f) => f.date === date);
  const food = meals && !!data.foodCompletions[date];
  const trained = data.activityLogs.some((a) => a.date === date);
  const rest = !!data.recoveryLogs[date];
  const activity = trained || rest;
  const done = Number(food) + Number(activity);
  return {
    food,
    foodStatus: food ? 'done' : meals ? 'inProgress' : 'open',
    activity,
    activityStatus: trained ? 'trained' : rest ? 'rest' : 'open',
    done,
    complete: done === DAILY_TASKS,
  };
}

/** Optional: the plan for the day after `date` is saved (shown as a hint only, never required). */
export const isNextDayPlanned = (data: AppData, date: ISODate): boolean => isPlanComplete(data.plans[addDays(date, 1)]);

export const startDate = (data: AppData): ISODate | null => (data.profile ? data.profile.onboardingCompletedAt.slice(0, 10) : null);

export function calendarStatus(data: AppData, date: ISODate, today: ISODate, start: ISODate | null): CalendarStatus {
  if (daysBetween(today, date) > 0) return 'future';
  const checks = dayChecks(data, date);
  if (checks.complete) return 'complete';
  if (date === today) return 'today';
  if (start && daysBetween(start, date) < 0) return checks.done > 0 ? 'partial' : 'before';
  return checks.done > 0 ? 'partial' : 'incomplete';
}

export interface StreakStats {
  current: number;
  longest: number;
  completedDays: number;
}

/**
 * Current streak: consecutive complete days ending today, or ending yesterday while today is still
 * in progress (an unfinished today never breaks the streak). A missed day ends the run, but completed
 * days, totals and the longest streak are never erased.
 */
export function streakStats(data: AppData, today: ISODate): StreakStats {
  const dates = new Set<ISODate>([...data.foodLogs.map((f) => f.date), ...Object.keys(data.foodCompletions), ...data.activityLogs.map((a) => a.date), ...Object.keys(data.recoveryLogs)]);
  const complete = [...dates].filter((d) => daysBetween(d, today) >= 0 && dayChecks(data, d).complete).sort();

  let longest = 0;
  let run = 0;
  let prev: ISODate | null = null;
  for (const d of complete) {
    run = prev && daysBetween(prev, d) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = d;
  }
  const set = new Set(complete);
  let current = 0;
  let cursor = set.has(today) ? today : addDays(today, -1);
  while (set.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }
  return { current, longest, completedDays: complete.length };
}

export interface JourneyStats extends StreakStats {
  workouts: number;
  recoveryDays: number;
  mealsLogged: number;
  /** Share of days since starting with a finalised food log (0–100), null before day 1 ends. */
  foodConsistency: number | null;
}

export function journeyStats(data: AppData, today: ISODate): JourneyStats {
  const s = streakStats(data, today);
  const start = startDate(data);
  const span = start ? daysBetween(start, today) + 1 : 0;
  const finalised = Object.keys(data.foodCompletions).filter((d) => dayChecks(data, d).food).length;
  return {
    ...s,
    workouts: data.activityLogs.length,
    recoveryDays: Object.keys(data.recoveryLogs).length,
    mealsLogged: data.foodLogs.length,
    foodConsistency: span > 0 ? Math.min(100, Math.round((finalised / span) * 100)) : null,
  };
}
