import { addDays, lastNDays } from '@/domain/dates';
import { generateMissions } from '@/domain/missions';
import type { AppData, Measurement, Mission, Mood, Reflection } from '@/domain/types';

/** Day of the program the sample data puts the user on. */
export const DEMO_DAY = 27;

const seeded = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

/**
 * Prototype only: turn a freshly built plan into one with realistic history, so every screen
 * (calendar, streaks, charts, journal) can be explored. Consistency improves over time, with
 * natural off days and planned recovery days. Clearly labelled as sample data in the UI.
 */
export function withDemoHistory(plan: AppData, today: string, reflectionTexts: string[]): AppData {
  if (!plan.program || !plan.profile) return plan;
  const startDate = addDays(today, -(DEMO_DAY - 1));
  const program = { ...plan.program, startDate };
  const random = seeded(7);
  const days: AppData['days'] = {};

  lastNDays(addDays(today, -1), DEMO_DAY - 1).forEach((date, i) => {
    const missions = generateMissions(plan.goals, program, date, plan.profile!.startingPoint);
    if (i % 9 === 5) {
      days[date] = { date, missions, generated: true, recovery: true };
      return;
    }
    const chance = 0.45 + (i / DEMO_DAY) * 0.45;
    const off = random() < 0.08;
    days[date] = {
      date,
      generated: true,
      recovery: false,
      missions: missions.map(
        (m): Mission =>
          !off && random() < chance ? { ...m, status: 'done', completedAt: `${date}T18:00:00.000Z` } : m,
      ),
    };
  });
  const todayMissions = generateMissions(plan.goals, program, today, plan.profile.startingPoint);
  days[today] = {
    date: today,
    generated: true,
    recovery: false,
    missions: todayMissions.map((m, i) => (i === 0 ? { ...m, status: 'done', completedAt: `${today}T08:00:00.000Z` } : m)),
  };

  const moods: Mood[] = [4, 3, 4, 5];
  const reflections: Reflection[] = reflectionTexts.map((body, i) => {
    const date = addDays(today, -(1 + i * 6));
    return { id: `demo-r${i}`, date, mood: moods[i % moods.length], body, promptKey: `reflection.prompts.p${(i % 5) + 1}`, createdAt: `${date}T21:00:00.000Z` };
  });

  const measurements: Measurement[] = [];
  for (let w = 0; w <= Math.floor((DEMO_DAY - 1) / 7); w++) {
    const date = addDays(startDate, w * 7);
    measurements.push(
      { id: `demo-w${w}`, date, metric: 'weight', value: Math.round((86.4 - w * 0.55 + (random() - 0.5) * 0.4) * 10) / 10, createdAt: `${date}T07:00:00.000Z` },
      { id: `demo-c${w}`, date, metric: 'confidence', value: Math.min(4 + w, 10), createdAt: `${date}T07:00:00.000Z` },
      { id: `demo-e${w}`, date, metric: 'energy', value: Math.min(5 + Math.round(w * 0.7), 10), createdAt: `${date}T07:00:00.000Z` },
    );
  }

  return { ...plan, program, days, reflections, measurements };
}
