import { journeyStats } from './completion';
import type { Achievement, AppData, ISODate } from './types';

/** Milestones reward consistency (planning, logging, recovery), never weight loss or restriction. */
export const MILESTONES = [
  { id: 'first_plan', test: (d: AppData) => Object.values(d.plans).some((p) => !!p.savedAt) },
  { id: 'first_day', test: (_: AppData, s: ReturnType<typeof journeyStats>) => s.completedDays >= 1 },
  { id: 'streak_3', test: (_: AppData, s: ReturnType<typeof journeyStats>) => s.longest >= 3 },
  { id: 'streak_7', test: (_: AppData, s: ReturnType<typeof journeyStats>) => s.longest >= 7 },
  { id: 'streak_30', test: (_: AppData, s: ReturnType<typeof journeyStats>) => s.longest >= 30 },
  { id: 'days_30', test: (_: AppData, s: ReturnType<typeof journeyStats>) => s.completedDays >= 30 },
  { id: 'workouts_10', test: (_: AppData, s: ReturnType<typeof journeyStats>) => s.workouts >= 10 },
  { id: 'meals_50', test: (_: AppData, s: ReturnType<typeof journeyStats>) => s.mealsLogged >= 50 },
  { id: 'first_recovery', test: (_: AppData, s: ReturnType<typeof journeyStats>) => s.recoveryDays >= 1 },
] as const;

export type MilestoneId = (typeof MILESTONES)[number]['id'];

/** Milestones newly earned by the current data. Earned milestones are stored and never removed. */
export function newlyEarned(data: AppData, today: ISODate, now: string): Achievement[] {
  const stats = journeyStats(data, today);
  const have = new Set(data.achievements.map((a) => a.id));
  return MILESTONES.filter((m) => !have.has(m.id) && m.test(data, stats)).map((m) => ({ id: m.id, earnedAt: now }));
}
