import { getGoal } from './catalog';
import { daysBetween, lastNDays } from './dates';
import { PILLARS, type CompletionLog, type GoalId, type ISODate, type Pillar } from './types';

/**
 * The Prime Score reflects how consistently someone follows through on the goals
 * they chose. It is NOT a measure of health, fitness or personal worth.
 *
 * score = completed check-ins / planned check-ins over a rolling window (default 7 days).
 * Days before the user's start date are not counted, so new users are never penalised.
 */

export interface ScorePart {
  completed: number;
  planned: number;
  /** 0–100, or null when nothing was planned. */
  score: number | null;
}

export interface PrimeScore extends ScorePart {
  byPillar: Record<Pillar, ScorePart>;
  days: ISODate[];
}

export interface ScoreInput {
  goalIds: GoalId[];
  log: CompletionLog;
  startDate: ISODate;
  today: ISODate;
  windowDays?: number;
}

const toPart = (completed: number, planned: number): ScorePart => ({
  completed,
  planned,
  score: planned === 0 ? null : Math.round((completed / planned) * 100),
});

export const scoreDays = (startDate: ISODate, today: ISODate, windowDays: number): ISODate[] =>
  lastNDays(today, windowDays).filter((d) => daysBetween(startDate, d) >= 0);

export function computePrimeScore({ goalIds, log, startDate, today, windowDays = 7 }: ScoreInput): PrimeScore {
  const days = scoreDays(startDate, today, windowDays);
  const active = new Set(goalIds);
  const tallies = Object.fromEntries(PILLARS.map((p) => [p, { completed: 0, planned: 0 }])) as Record<
    Pillar,
    { completed: number; planned: number }
  >;

  for (const id of goalIds) {
    const goal = getGoal(id);
    if (goal) tallies[goal.pillar].planned += days.length;
  }
  for (const day of days) {
    for (const id of new Set(log[day] ?? [])) {
      const goal = getGoal(id);
      if (goal && active.has(id)) tallies[goal.pillar].completed += 1;
    }
  }

  const completed = PILLARS.reduce((s, p) => s + tallies[p].completed, 0);
  const planned = PILLARS.reduce((s, p) => s + tallies[p].planned, 0);
  const byPillar = Object.fromEntries(
    PILLARS.map((p) => [p, toPart(tallies[p].completed, tallies[p].planned)]),
  ) as Record<Pillar, ScorePart>;

  return { ...toPart(completed, planned), byPillar, days };
}

export interface DayCompletion {
  date: ISODate;
  completed: number;
  planned: number;
  ratio: number;
}

export function dailyCompletion(goalIds: GoalId[], log: CompletionLog, dates: ISODate[]): DayCompletion[] {
  const active = new Set(goalIds);
  return dates.map((date) => {
    const completed = new Set((log[date] ?? []).filter((id) => active.has(id))).size;
    const planned = goalIds.length;
    return { date, completed, planned, ratio: planned ? completed / planned : 0 };
  });
}

/** Every level is framed positively; there is no "failing" state. */
export type ScoreLevel = 'beginning' | 'rhythm' | 'momentum' | 'prime';

export const scoreLevel = (score: number | null): ScoreLevel => {
  if (score === null || score < 25) return 'beginning';
  if (score < 55) return 'rhythm';
  if (score < 80) return 'momentum';
  return 'prime';
};
