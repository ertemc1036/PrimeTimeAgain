import { useMemo } from 'react';

import { getGoal } from '@/domain/catalog';
import { lastNDays } from '@/domain/dates';
import { activeDays, journeyDay } from '@/domain/journey';
import { computePrimeScore, dailyCompletion } from '@/domain/primeScore';
import type { GoalDefinition } from '@/domain/types';

import { useAppState } from './AppStateProvider';

/** Derived, memoised view of the app state used by several screens. */
export function useDashboard() {
  const { data, today } = useAppState();
  return useMemo(() => {
    const startDate = data.profile?.startDate ?? today;
    const goals = data.goalIds.map(getGoal).filter((g): g is GoalDefinition => !!g);
    const doneToday = new Set(data.log[today] ?? []);
    const week = lastNDays(today, 7);
    return {
      goals,
      doneToday,
      completedToday: goals.filter((g) => doneToday.has(g.id)).length,
      score: computePrimeScore({ goalIds: data.goalIds, log: data.log, startDate, today }),
      week: dailyCompletion(data.goalIds, data.log, week),
      day: journeyDay(startDate, today),
      activeDays: activeDays(data.log, startDate, today),
      totalCheckIns: Object.values(data.log).reduce((n, ids) => n + ids.length, 0),
    };
  }, [data, today]);
}
