import type { TFunction } from 'i18next';

import type { IconName } from '@/components/ui';
import type { MealType, PlannedActivity, PlannedActivityType, WorkoutType } from '@/domain/types';

export const ACTIVITY_ICONS: Record<PlannedActivityType | 'outdoor', IconName> = {
  gym: 'barbell-outline',
  outdoor: 'walk-outline',
  outdoor_walk: 'walk-outline',
  outdoor_run: 'speedometer-outline',
  home: 'home-outline',
  rest: 'moon-outline',
};

export const MEAL_ICONS: Record<MealType, IconName> = {
  breakfast: 'sunny-outline',
  lunch: 'restaurant-outline',
  dinner: 'moon-outline',
  snack: 'nutrition-outline',
};

export const WORKOUT_TYPES: readonly WorkoutType[] = ['gym', 'outdoor_walk', 'outdoor_run', 'home'];

export const activityLabel = (t: TFunction, type: PlannedActivityType) => t(`activity.${type}`);

export const mealLabel = (t: TFunction, type: MealType, single = false) => (type === 'snack' && single ? t('meals.snackSingle') : t(`meals.${type}`));

export function activitySummary(t: TFunction, a: PlannedActivity): string {
  const label = activityLabel(t, a.type);
  if (a.type === 'rest' || !a.time) return label;
  return a.durationMin
    ? t('activity.summary', { activity: label, time: a.time, duration: t('common.min', { count: a.durationMin }) })
    : t('activity.summaryNoDuration', { activity: label, time: a.time });
}
