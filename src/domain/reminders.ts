import { dayChecks } from './completion';
import { addDays, formatTime, isWithinWindow, parseTime } from './dates';
import type { AppData, DisciplineMode, ISODate, LocalTime } from './types';

/**
 * Discipline Mode reminder planner (pure). The app reschedules local notifications from this list
 * whenever data or settings change, so a reminder disappears once its task is done.
 * Copy is neutral; acknowledging a reminder is never required for anything.
 */
export type ReminderKind = 'morning' | 'activity' | 'meal' | 'planning' | 'checkin' | 'hourly' | 'window';

export interface PlannedReminder {
  id: string;
  date: ISODate;
  time: LocalTime;
  kind: ReminderKind;
}

const MODE_KINDS: Record<DisciplineMode, ReminderKind[]> = {
  light: ['planning'],
  smart: ['morning', 'activity', 'planning'],
  focused: ['morning', 'activity', 'meal', 'planning', 'checkin'],
  hourly: ['morning', 'activity', 'meal', 'planning', 'checkin', 'hourly'],
};

export function planReminders(data: AppData, today: ISODate, nowTime: LocalTime, days = 2): PlannedReminder[] {
  const n = data.notifications;
  const out: PlannedReminder[] = [];
  if (!data.profile) return out;
  if (n.enabled && !n.paused) {
    const kinds = new Set(MODE_KINDS[n.mode]);
    for (let i = 0; i < days; i++) {
      const date = addDays(today, i);
      const checks = dayChecks(data, date);
      const plan = data.plans[date];
      const add = (time: LocalTime | undefined, kind: ReminderKind, key: string = kind) => {
        if (!time || parseTime(time) === null) return;
        out.push({ id: `${date}:${key}`, date, time, kind });
      };
      if (kinds.has('morning')) add(n.morningTime, 'morning');
      if (kinds.has('activity') && !checks.activity && plan?.activity && plan.activity.type !== 'rest') add(plan.activity.time, 'activity');
      if (kinds.has('meal') && plan) {
        for (const meal of plan.meals) {
          const logged = data.foodLogs.some((f) => f.date === date && f.mealType === meal.mealType);
          if (!logged) add(meal.time, 'meal', `meal-${meal.id}`);
        }
      }
      if (kinds.has('planning') && !checks.planning) add(data.profile.planningTime, 'planning');
      if (kinds.has('checkin') && !checks.complete) {
        const p = parseTime(data.profile.planningTime) ?? 20 * 60;
        add(formatTime(Math.min(p + 90, 23 * 60 + 30)), 'checkin');
      }
      if (kinds.has('hourly') && !checks.complete) {
        const s = parseTime(n.hourlyStart) ?? 9 * 60;
        const e = parseTime(n.hourlyEnd) ?? 20 * 60;
        for (let t = Math.ceil(s / 60) * 60; t <= e; t += 60) add(formatTime(t), 'hourly', `hourly-${t}`);
      }
    }
  }
  if (data.eatingWindow.enabled && data.eatingWindow.reminders) {
    for (let i = 0; i < days; i++) out.push({ id: `${addDays(today, i)}:window`, date: addDays(today, i), time: data.eatingWindow.start, kind: 'window' });
  }
  const quiet = (r: PlannedReminder) => r.kind !== 'window' && isWithinWindow(r.time, n.quietStart, n.quietEnd) && n.quietStart !== n.quietEnd;
  const future = (r: PlannedReminder) => r.date !== today || (parseTime(r.time) ?? 0) > (parseTime(nowTime) ?? 0);
  // De-duplicate same-minute reminders, keeping the most specific one.
  const seen = new Set<string>();
  return out
    .filter((r) => future(r) && !quiet(r))
    .sort((a, b) => (a.date + a.time < b.date + b.time ? -1 : 1))
    .filter((r) => {
      const k = `${r.date} ${r.time}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 60); // iOS keeps at most 64 scheduled local notifications
}
