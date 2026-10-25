import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppText, Card, ListRow, Screen } from '@/components/ui';
import { activityLabel } from '@/features/labels';
import { formatDate } from '@/i18n/format';
import { useLocale } from '@/i18n/useLanguage';
import { useAppState } from '@/state/AppStateProvider';

export default function WorkoutHistory() {
  const { t } = useTranslation();
  const locale = useLocale();
  const { data } = useAppState();
  const rows = [
    ...data.activityLogs.map((a) => ({ id: a.id, date: a.date, label: `${activityLabel(t, a.type)} · ${t('common.min', { count: a.durationMin })}`, hint: `${a.startTime} · ${a.description}`, edit: true })),
    ...Object.values(data.recoveryLogs).map((r) => ({ id: `rest_${r.date}`, date: r.date, label: t('activity.rest'), hint: t('workout.restBody'), edit: false })),
  ].sort((a, b) => (a.date < b.date ? 1 : -1));
  return (
    <Screen back="back" title={t('history.workouts')}>
      {rows.length === 0 ? <AppText color="secondary">{t('history.empty')}</AppText> : null}
      {rows.length ? (
        <Card variant="outline" padded={false}>
          {rows.slice(0, 200).map((r, i) => (
            <ListRow
              key={r.id}
              label={r.label}
              hint={`${formatDate(r.date, locale, { day: 'numeric', month: 'short' })} · ${r.hint}`}
              onPress={r.edit ? () => router.push({ pathname: '/workout-log', params: { id: r.id } }) : undefined}
              divider={i < rows.length - 1}
            />
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}
