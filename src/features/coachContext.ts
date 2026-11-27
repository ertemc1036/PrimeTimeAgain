import { dayChecks, journeyStats } from '@/domain/completion';
import { addDays } from '@/domain/dates';
import { journeyPosition, MONTH_KEYS } from '@/domain/journey';
import { hasHealthConsent } from '@/domain/consent';
import { totals } from '@/domain/nutrition';
import type { AppData, ISODate } from '@/domain/types';

/**
 * The context the AI Coach may see — only when the user turned on consent in Privacy and data.
 * A compact summary of recent, relevant data (last days of meals, workouts and water); no weight,
 * photos, notes or chat history. Weight stays private (sensitive; possible eating-disorder risk).
 */
export function coachContext(data: AppData, today: ISODate): Record<string, unknown> | null {
  if (!data.coach.consentToContext || !data.profile) return null;
  const p = data.profile;
  const since = (n: number) => addDays(today, -n);
  const stats = journeyStats(data, today);
  const plan = (d: ISODate) => {
    const x = data.plans[d];
    return x ? { meals: x.meals.map((m) => ({ meal: m.mealType, title: m.title, time: m.time })), flexibleMeals: x.flexibleMeals, activity: x.activity } : null;
  };
  const j = data.journey;
  const pos = j.programEnabled && j.startDate ? journeyPosition(j.startDate, today) : null;
  return {
    today,
    goals: p.goals,
    primaryGoal: p.primaryGoal,
    // A health reason was reported in the onboarding check (details stay on the device): Prime must
    // not suggest a calorie deficit or weight-loss targets.
    noCalorieDeficit: (hasHealthConsent(p) && (p.healthFlags ?? []).length > 0) || undefined,
    workoutsPerWeek: p.workoutsPerWeek,
    challenges: p.challenges,
    motivations: p.motivations,
    triedOtherApps: p.triedOtherApps,
    hasCoach: p.hasCoach,
    diet: p.diet,
    activityPreferences: p.activityPrefs,
    // Allergies and special requirements are health data: only with the separate health-data consent.
    food: hasHealthConsent(p)
      ? { preferred: p.food.preferred, restrictions: p.food.restrictions, allergies: p.food.allergies, dislikes: p.food.dislikes }
      : { preferred: p.food.preferred, dislikes: p.food.dislikes },
    planningTime: p.planningTime,
    todayStatus: dayChecks(data, today),
    todayPlan: plan(today),
    tomorrowPlan: plan(addDays(today, 1)),
    recentMeals: data.foodLogs
      .filter((f) => f.date >= since(2))
      .map((f) => ({ date: f.date, meal: f.mealType, title: f.title, kcal: totals(f.items).estimated ? totals(f.items).kcal : null })),
    recentWorkouts: data.activityLogs.filter((a) => a.date >= since(6)).map((a) => ({ date: a.date, type: a.type, minutes: a.durationMin })),
    recentRestDays: Object.keys(data.recoveryLogs).filter((d) => d >= since(6)),
    streak: { current: stats.current, longest: stats.longest, completedDays: stats.completedDays },
    journey: pos ? { month: pos.month, theme: MONTH_KEYS[Math.min(pos.month, 7) - 1], finished: pos.finished, maintenance: j.maintenance } : { maintenance: j.maintenance },
    eatingWindow: data.eatingWindow.enabled ? { start: data.eatingWindow.start, end: data.eatingWindow.end } : null,
    name: p.name,
    program: p.program ?? 'weightLoss',
    water: {
      goalMl: p.waterGoalMl ?? 2000,
      byDay: Object.fromEntries(
        [0, 1, 2, 3, 4, 5, 6].map((n) => {
          const d = since(n);
          return [d, data.water.filter((w) => w.date === d).reduce((s, w) => s + w.ml, 0)];
        }),
      ),
    },
  };
}
