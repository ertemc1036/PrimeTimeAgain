import { getGoal } from '@/domain/catalog';
import { addDays, lastNDays } from '@/domain/dates';
import type { AppData, CompletionLog, GoalId, ISODate, Mood, Profile, Reflection } from '@/domain/types';

/** How far into the journey the sample data starts the user. */
export const DEMO_DAY = 19;

/** Small deterministic PRNG so sample data looks the same on every run. */
const seeded = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

export interface DemoInput {
  profile: Omit<Profile, 'startDate'>;
  goalIds: GoalId[];
  today: ISODate;
  /** Already-translated sample reflection texts, newest first. */
  reflectionTexts: string[];
}

/**
 * Realistic sample history: consistency improves gradually, with natural off days,
 * and today is partly done so every screen has something to show.
 */
export function buildDemoData({ profile, goalIds, today, reflectionTexts }: DemoInput): AppData {
  const startDate = addDays(today, -(DEMO_DAY - 1));
  const random = seeded(42);
  const log: CompletionLog = {};

  lastNDays(addDays(today, -1), DEMO_DAY - 1).forEach((date, i) => {
    const chance = 0.5 + (i / DEMO_DAY) * 0.35; // ~50% early on, ~85% recently
    const offDay = random() < 0.1;
    log[date] = offDay ? [] : goalIds.filter(() => random() < chance);
  });
  // Today: the first goal is done, the rest are still open.
  log[today] = goalIds.slice(0, 1);

  const moods: Mood[] = [4, 3, 4];
  const prompts = ['reflection.prompts.p2', 'reflection.prompts.p1', 'reflection.prompts.p3'];
  const reflections: Reflection[] = reflectionTexts.map((body, i) => {
    const date = addDays(today, -(1 + i * 4));
    return {
      id: `demo-${i}`,
      date,
      mood: moods[i % moods.length],
      promptKey: prompts[i % prompts.length],
      body,
      createdAt: `${date}T20:30:00.000Z`,
    };
  });

  return {
    version: 1,
    profile: { ...profile, startDate },
    goalIds: goalIds.filter((id) => !!getGoal(id)),
    log,
    reflections,
    preferences: { reminders: false },
  };
}
