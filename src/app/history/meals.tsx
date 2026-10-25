import { router } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Card, ListRow, Screen } from '@/components/ui';
import { totals } from '@/domain/nutrition';
import { mealLabel } from '@/features/labels';
import { formatDate } from '@/i18n/format';
import { useLocale } from '@/i18n/useLanguage';
import { useAppState } from '@/state/AppStateProvider';

export default function MealHistory() {
  const { t } = useTranslation();
  const locale = useLocale();
  const { data } = useAppState();
  const byDate = new Map<string, typeof data.foodLogs>();
  for (const f of [...data.foodLogs].sort((a, b) => (a.consumedAt < b.consumedAt ? 1 : -1))) byDate.set(f.date, [...(byDate.get(f.date) ?? []), f]);
  return (
    <Screen back="back" title={t('history.meals')} scroll={false}>
      {byDate.size === 0 ? <AppText color="secondary">{t('history.empty')}</AppText> : null}
      <FlatList
        data={[...byDate.entries()]}
        keyExtractor={([date]) => date}
        initialNumToRender={8}
        windowSize={7}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={Gap}
        renderItem={({ item: [date, logs] }) => (
        <View style={styles.day}>
          <AppText variant="label" color="secondary">
            {formatDate(date, locale, { weekday: 'long', day: 'numeric', month: 'long' })}
          </AppText>
          <Card variant="outline" padded={false}>
            {logs.map((l, i) => {
              const tot = totals(l.items);
              return (
                <ListRow
                  key={l.id}
                  label={l.title}
                  hint={`${mealLabel(t, l.mealType, true)} · ${l.time}`}
                  value={tot.estimated ? t('common.kcal', { value: tot.kcal }) : undefined}
                  onPress={() => router.push({ pathname: '/food-entry', params: { id: l.id } })}
                  divider={i < logs.length - 1}
                />
              );
            })}
          </Card>
        </View>
        )}
      />
    </Screen>
  );
}

const Gap = () => <View style={styles.gap} />;
const styles = StyleSheet.create({ day: { gap: 8 }, gap: { height: 16 } });
