import type { GymDay, KitchenDay, WaterDay } from './daySummary';
import type { PlannedActivity } from './types';

/**
 * Prime's daily briefing on Today: a short, friendly note built only from what is actually saved
 * (plans, logged meals, training, water, the planning routine). No AI call and nothing invented;
 * the UI turns each part into a translated sentence.
 */
export type BriefingPart =
  | { key: 'greeting'; period: 'morning' | 'afternoon' | 'evening' }
  | { key: 'trainingPlanned'; activity: PlannedActivity }
  | { key: 'trainingDone'; minutes: number }
  | { key: 'restDay' }
  | { key: 'mealsOpen'; count: number }
  | { key: 'firstMeal' }
  | { key: 'water' }
  | { key: 'planTomorrow' }
  | { key: 'dayComplete' }
  | { key: 'prepareDay' };

export interface BriefingInput {
  hour: number;
  kitchen: KitchenDay;
  gym: GymDay;
  water: WaterDay;
  /** The three daily checks (food, activity, planning tomorrow). */
  checks: { food: boolean; activity: boolean; planning: boolean; complete: boolean };
}

/** Greeting plus at most two facts, most useful first. */
export function dailyBriefing({ hour, kitchen, gym, water, checks }: BriefingInput): BriefingPart[] {
  const period = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
  const parts: BriefingPart[] = [{ key: 'greeting', period }];
  const facts: BriefingPart[] = [];

  if (checks.complete) facts.push({ key: 'dayComplete' });
  else {
    if (gym.sessions > 0) facts.push({ key: 'trainingDone', minutes: gym.minutes });
    else if (gym.rest || gym.planned?.type === 'rest') facts.push({ key: 'restDay' });
    else if (gym.planned) facts.push({ key: 'trainingPlanned', activity: gym.planned });

    if (kitchen.openMeals.length) facts.push({ key: 'mealsOpen', count: kitchen.openMeals.length });
    else if (!kitchen.mealsLogged && hour >= 10) facts.push({ key: 'firstMeal' });

    if (hour >= 17 && !checks.planning) facts.push({ key: 'planTomorrow' });
    if (hour >= 13 && water.ml < water.goalMl / 3) facts.push({ key: 'water' });
  }
  if (!facts.length) facts.push({ key: 'prepareDay' });
  return [...parts, ...facts.slice(0, 2)];
}
