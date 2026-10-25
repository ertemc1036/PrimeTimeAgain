import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { FlatList } from 'react-native';

import { AppText, ListRow, Screen } from '@/components/ui';
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
    <Screen back="back" title={t('history.workouts')} scroll={false}>
      {rows.length === 0 ? <AppText color="secondary">{t('history.empty')}</AppText> : null}
      <FlatList
        data={rows}
        keyExtractor={(r) => r.id}
        initialNumToRender={20}
        windowSize={7}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: r, index }) => (
          <ListRow
            label={r.label}
            hint={`${formatDate(r.date, locale, { day: 'numeric', month: 'short' })} · ${r.hint}`}
            onPress={r.edit ? () => router.push({ pathname: '/workout-log', params: { id: r.id } }) : undefined}
            divider={index < rows.length - 1}
          />
        )}
      />
    </Screen>
  );
}
