import { useMemo } from 'react';

import { getGoalTemplate, AREA_ICONS, getActionTemplate } from '@/domain/catalog';
import { dayType, streakInfo } from '@/domain/days';
import { currentPhase, isProgramComplete, programDay, programDayRaw } from '@/domain/program';
import type { Mission, UserGoal } from '@/domain/types';

import { useAppState } from './AppStateProvider';

export function useProgramInfo() {
  const { data, today } = useAppState();
  return useMemo(() => {
    const program = data.program;
    if (!program) return null;
    return {
      program,
      day: programDay(program, today),
      rawDay: programDayRaw(program, today),
      phase: currentPhase(program, today),
      complete: isProgramComplete(program, today),
    };
  }, [data.program, today]);
}

export function useStreak() {
  const { data, today } = useAppState();
  return useMemo(() => streakInfo(data.program, data.days, today), [data.program, data.days, today]);
}

export function useGoalsById() {
  const { data } = useAppState();
  return useMemo(() => new Map(data.goals.map((g) => [g.id, g])), [data.goals]);
}

export const activeGoals = (goals: UserGoal[]) => goals.filter((g) => !g.archived);

export function useToday() {
  const { data, today } = useAppState();
  return useMemo(() => {
    const day = data.days[today];
    const missions = day?.missions ?? [];
    const planned = missions.filter((m) => m.status !== 'postponed');
    const done = planned.filter((m) => m.status === 'done');
    return {
      day,
      missions,
      planned,
      doneCount: done.length,
      total: planned.length,
      minutesDone: done.reduce((s, m) => s + m.minutes, 0),
      minutesPlanned: planned.reduce((s, m) => s + m.minutes, 0),
      type: dayType(data.program, day, today, today),
      recovery: !!day?.recovery,
    };
  }, [data.days, data.program, today]);
}

/** Glyph for a goal (catalogue icon, or the area's icon for custom goals). */
export const goalGlyph = (goal: UserGoal) => getGoalTemplate(goal.templateId)?.icon ?? AREA_ICONS[goal.area];

export const missionGlyph = (mission: Mission, goal: UserGoal | undefined) =>
  getActionTemplate(mission.actionTemplateId)?.icon ?? (goal ? goalGlyph(goal) : 'ellipse');
