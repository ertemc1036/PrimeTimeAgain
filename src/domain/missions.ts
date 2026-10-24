import { getActionTemplate, getGoalTemplate } from './catalog';
import { daysBetween } from './dates';
import type { DayRecord, GoalAction, ISODate, Mission, Program, StartingPoint, UserGoal } from './types';

/** Upper bound of core missions per day, scaled by the time the user has. */
export const maxMissionsFor = (dailyMinutes: number) => Math.min(Math.max(Math.round(dailyMinutes / 15) + 1, 2), 6);

const activeGoals = (goals: UserGoal[]) => goals.filter((g) => !g.archived && g.actions.some((a) => a.active));

/** Easier actions first in the first two weeks, and for people starting with low activity. */
function rankActions(goal: UserGoal, dayIndex: number, start: StartingPoint): GoalAction[] {
  const actions = goal.actions.filter((a) => a.active);
  const gentle = dayIndex < 14 || (goal.area === 'body' && start.activity === 'low');
  const pool = gentle && actions.some((a) => a.difficulty <= 2) ? actions.filter((a) => a.difficulty <= 2) : actions;
  // Rotate so each goal suggests a different action from day to day.
  const offset = dayIndex % pool.length;
  return [...pool.slice(offset), ...pool.slice(0, offset)];
}

export const missionFromAction = (date: ISODate, goal: UserGoal, action: GoalAction, n = 0): Mission => ({
  id: `${date}:${goal.id}:${action.id}${n ? `:${n}` : ''}`,
  goalId: goal.id,
  actionId: action.id,
  actionTemplateId: action.templateId,
  title: action.title,
  minutes: action.minutes,
  difficulty: action.difficulty,
  status: 'open',
});

/**
 * Today's core missions. Deterministic for a given plan and date.
 * - Total time stays within the user's daily minutes (carried-over missions count too).
 * - Goals take turns leading, so every goal gets attention across the week.
 * - At least one mission is planned whenever any goal has an action.
 */
export function generateMissions(
  goals: UserGoal[],
  program: Program,
  date: ISODate,
  start: StartingPoint,
  carried: Mission[] = [],
): Mission[] {
  const list = activeGoals(goals);
  if (list.length === 0) return [];
  const dayIndex = Math.max(daysBetween(program.startDate, date), 0);
  const rotated = list.map((_, i) => list[(i + dayIndex) % list.length]);
  const max = maxMissionsFor(program.dailyMinutes);
  let remaining = program.dailyMinutes - carried.reduce((s, m) => s + m.minutes, 0);
  const picked: Mission[] = [];
  const usedActions = new Set(carried.map((m) => m.actionTemplateId ?? m.actionId));

  for (let round = 0; round < 3 && picked.length + carried.length < max; round++) {
    for (const goal of rotated) {
      if (picked.length + carried.length >= max) break;
      const ranked = rankActions(goal, dayIndex, start).filter((a) => !usedActions.has(a.templateId ?? a.id));
      const candidate = ranked.slice(round).find((a) => a.minutes <= remaining);
      if (!candidate) continue;
      picked.push(missionFromAction(date, goal, candidate));
      usedActions.add(candidate.templateId ?? candidate.id);
      remaining -= candidate.minutes;
    }
  }

  if (picked.length === 0 && carried.length === 0) {
    // Nothing fits the budget: suggest the single shortest action rather than nothing.
    const shortest = rotated
      .flatMap((g) => g.actions.filter((a) => a.active).map((a) => ({ g, a })))
      .sort((x, y) => x.a.minutes - y.a.minutes)[0];
    picked.push(missionFromAction(date, shortest.g, shortest.a));
  }
  return picked;
}

/** Another action for the same goal that isn't already planned today (or null). */
export function replacementFor(mission: Mission, goal: UserGoal, day: DayRecord): GoalAction | null {
  const used = new Set(day.missions.map((m) => m.actionTemplateId ?? m.actionId));
  const options = goal.actions.filter((a) => a.active && !used.has(a.templateId ?? a.id));
  if (options.length === 0) return null;
  // Prefer something of similar length.
  return [...options].sort((a, b) => Math.abs(a.minutes - mission.minutes) - Math.abs(b.minutes - mission.minutes))[0];
}

/** Default plan actions for a catalogue goal. */
export function templateActions(templateId: UserGoal['templateId']): GoalAction[] {
  const template = getGoalTemplate(templateId);
  const ids = template ? template.actions : ['custom_work', 'custom_plan', 'custom_review'];
  return ids.map((id) => {
    const a = getActionTemplate(id)!;
    return { id, templateId: id, minutes: a.minutes, difficulty: a.difficulty, active: true };
  });
}

export const missionMinutesDone = (day: DayRecord | undefined) =>
  (day?.missions ?? []).filter((m) => m.status === 'done').reduce((s, m) => s + m.minutes, 0);
