import type { TFunction } from 'i18next';

import type { PrimeAction } from '@/domain/primeActions';
import type { IconName } from '@/components/ui';
import { activityLabel, mealLabel } from '@/features/labels';

/** How a suggested action is shown: icon, one-line title, detail lines, and whether values are estimates. */
export function describeAction(a: PrimeAction, t: TFunction): { icon: IconName; title: string; lines: string[]; estimate: boolean } {
  const day = 'day' in a && a.day === 'yesterday' ? ` · ${t('common.yesterday')}` : '';
  switch (a.type) {
    case 'log_water':
      return { icon: 'water-outline', title: t('prime.action.water', { ml: a.ml }) + day, lines: [], estimate: false };
    case 'log_meal': {
      const lines = a.items.map((i) =>
        [`${i.name} · ${i.quantity} ${i.unit}`, i.kcal !== null ? t('prime.action.kcalApprox', { kcal: Math.round(i.kcal) }) : t('prime.action.noEstimate')].join(' · '),
      );
      const known = a.items.filter((i) => i.kcal !== null);
      if (known.length) lines.push(t('prime.action.totalApprox', { kcal: Math.round(known.reduce((s, i) => s + (i.kcal ?? 0), 0)) }));
      return { icon: 'restaurant-outline', title: `${mealLabel(t, a.mealType, true)}: ${a.title}${a.time ? ` · ${a.time}` : ''}${day}`, lines, estimate: known.length > 0 };
    }
    case 'log_workout':
      return {
        icon: 'barbell-outline',
        title: `${activityLabel(t, a.workoutType)} · ${t('prime.action.minutes', { count: a.durationMin })}${a.time ? ` · ${a.time}` : ''}${day}`,
        lines: a.description ? [a.description] : [],
        estimate: false,
      };
    case 'log_rest_day':
      return { icon: 'bed-outline', title: t('prime.action.rest') + day, lines: [], estimate: false };
    case 'log_weight':
      return { icon: 'scale-outline', title: t('prime.action.weight', { kg: a.kg }) + day, lines: [], estimate: false };
    case 'remember':
      return { icon: 'bookmark-outline', title: t('prime.action.remember'), lines: [a.text], estimate: false };
  }
}
