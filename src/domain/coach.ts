import { addDays } from './dates';
import { dayType, streakInfo } from './days';
import { currentPhase, programDay } from './program';
import { activeAreas, areaProgress, overallProgress } from './progress';
import type { AppData, AreaId, ISODate } from './types';

/**
 * Coach preview: deterministic, rule-based guidance from the user's own plan data, on device.
 * It never gives medical, nutritional or financial advice. The future AI coach will run
 * server-side (see services/coach) and only read reflections with explicit consent.
 */
export type CoachMessage =
  | { key: 'start' | 'allDone' | 'someDone' | 'recovery' | 'afterMiss' }
  | { key: 'noneYet'; minutes: number }
  | { key: 'streak'; count: number };

export type CoachTip =
  | { key: 'lowArea'; area: AreaId; percent: number }
  | { key: 'tooMuch' }
  | { key: 'strong' }
  | { key: 'phase'; phase: 'reset' | 'rebuild' | 'prime' };

export function coachToday(data: AppData, today: ISODate): CoachMessage {
  const { program } = data;
  if (!program) return { key: 'start' };
  const day = data.days[today];
  const type = dayType(program, day, today, today);
  if (type === 'recovery') return { key: 'recovery' };
  if (type === 'prime') return { key: 'allDone' };
  if (type === 'active') return { key: 'someDone' };
  if (programDay(program, today) === 1) return { key: 'start' };
  const streak = streakInfo(program, data.days, today).current;
  if (streak >= 3) return { key: 'streak', count: streak };
  if (dayType(program, data.days[addDays(today, -1)], addDays(today, -1), today) === 'missed') return { key: 'afterMiss' };
  const open = (day?.missions ?? []).filter((m) => m.status === 'open').sort((a, b) => a.minutes - b.minutes);
  return open.length ? { key: 'noneYet', minutes: open[0].minutes } : { key: 'start' };
}

export function coachTips(data: AppData, today: ISODate): CoachTip[] {
  const { program } = data;
  if (!program) return [];
  const tips: CoachTip[] = [{ key: 'phase', phase: currentPhase(program, today).id }];
  const overall = overallProgress(program, data.days, today);
  if (overall.planned >= 6 && overall.percent !== null) {
    if (overall.percent < 50) tips.push({ key: 'tooMuch' });
    else if (overall.percent >= 80) tips.push({ key: 'strong' });
  }
  const weakest = activeAreas(data.goals)
    .map((area) => ({ area, p: areaProgress(area, data.goals, program, data.days, today) }))
    .filter((a) => a.p.planned >= 4 && a.p.percent !== null && a.p.percent < 40)
    .sort((a, b) => (a.p.percent ?? 0) - (b.p.percent ?? 0))[0];
  if (weakest) tips.push({ key: 'lowArea', area: weakest.area, percent: weakest.p.percent ?? 0 });
  return tips;
}
