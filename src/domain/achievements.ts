import { streakInfo } from './days';
import { phases, programDayRaw } from './program';
import { totals } from './progress';
import type { AppData, ISODate } from './types';

export type AchievementId = 'first_mission' | 'first_prime' | 'streak_7' | 'missions_25' | 'missions_100' | 'hours_10' | 'phase_reset';

export const ACHIEVEMENTS: readonly AchievementId[] = ['first_mission', 'first_prime', 'streak_7', 'missions_25', 'hours_10', 'phase_reset', 'missions_100'];

/** Achievements reward consistency and effort, never appearance or outcomes. */
export function unlockedAchievements(data: AppData, today: ISODate): Set<AchievementId> {
  const out = new Set<AchievementId>();
  const t = totals(data.days);
  const s = streakInfo(data.program, data.days, today);
  if (t.missionsDone >= 1) out.add('first_mission');
  if (s.primeDays >= 1) out.add('first_prime');
  if (s.longest >= 7) out.add('streak_7');
  if (t.missionsDone >= 25) out.add('missions_25');
  if (t.missionsDone >= 100) out.add('missions_100');
  if (t.minutesInvested >= 600) out.add('hours_10');
  if (data.program && programDayRaw(data.program, today) > phases(data.program.durationDays)[0].endDay) out.add('phase_reset');
  return out;
}
