import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Card, EmptyState, Icon, PressableScale, ProBadge, Screen } from '@/components/ui';
import { dayChecks } from '@/domain/completion';
import { totals } from '@/domain/nutrition';
import { MEAL_TYPES, type ISODate } from '@/domain/types';
import { DaySwitch } from '@/features/DaySwitch';
import { mealLabel } from '@/features/labels';
import { NutritionSummary } from '@/features/NutritionSummary';
import { useSave } from '@/hooks/useSave';
import { useAppState } from '@/state/AppStateProvider';
import { usePro } from '@/state/ProProvider';
import { colors, radii, spacing } from '@/theme';
import { nowISO } from '@/utils/id';

export default function FoodTab() {
  const { t } = useTranslation();
  const { data, today } = useAppState();
  const { canOpenPro } = usePro();
  const save = useSave();
  const [date, setDate] = useState<ISODate>(today);
  const [error, setError] = useState<string | null>(null);
  const isToday = date === today;

  const logs = data.foodLogs.filter((f) => f.date === date).sort((a, b) => (a.time < b.time ? -1 : 1));
  const planned = data.plans[date]?.meals ?? [];
  const finished = !!data.foodCompletions[date];
  const checks = dayChecks(data, date);
  const sum = totals(logs.flatMap((l) => l.items));
  const win = data.eatingWindow;

  const finish = async () => {
    if (!logs.length) return setError(t('food.needMeal'));
    setError(null);
    await save({ type: 'finishFoodLog', date, at: nowISO() }, t('food.finished'));
  };

  return (
    <Screen inTabs title={isToday ? t('food.title') : t('food.dayYesterday')} subtitle={t('food.subtitle')}>
      <DaySwitch today={today} value={date} onChange={setDate} />

      <View style={styles.actions}>
        <View style={styles.flex}>
          <Button label={t('food.add')} icon="add" onPress={() => router.push({ pathname: '/food-entry', params: { date } })} />
        </View>
        <PressableScale
          style={styles.scan}
          accessibilityRole="button"
          accessibilityLabel={`${t('food.scan')}, ${t('common.pro')}`}
          onPress={() => router.push(canOpenPro ? { pathname: '/food-scan', params: { date } } : '/pro')}>
          <Icon name="scan-outline" size={20} />
          <AppText variant="button">{t('food.scan')}</AppText>
          <ProBadge label={t('common.pro')} />
        </PressableScale>
      </View>

      {win.enabled ? (
        <AppText variant="caption" color="secondary">
          {t('food.eatingWindow', { start: win.start, end: win.end })}
        </AppText>
      ) : null}

      {planned.length ? (
        <View style={styles.section}>
          <AppText variant="heading">{t('food.planned')}</AppText>
          {planned.map((m) => {
            const logged = logs.some((l) => l.planMealId === m.id);
            return (
              <Card key={m.id} style={styles.plannedCard}>
                <View style={styles.flex}>
                  <AppText variant="label" color="secondary">
                    {mealLabel(t, m.mealType, true)}
                    {m.time ? ` · ${m.time}` : ''}
                  </AppText>
                  <AppText variant="bodyStrong">{m.title}</AppText>
                </View>
                {logged ? (
                  <View style={styles.logged}>
                    <Icon name="checkmark-circle" size={20} />
                    <AppText variant="label">{t('food.loggedPlanned')}</AppText>
                  </View>
                ) : (
                  <Button label={t('food.logThis')} size="sm" fullWidth={false} onPress={() => router.push({ pathname: '/food-entry', params: { date, planMealId: m.id } })} />
                )}
              </Card>
            );
          })}
        </View>
      ) : null}

      <View style={styles.section}>
        <AppText variant="heading">{t('food.logged')}</AppText>
        {logs.length === 0 ? (
          <Card>
            <EmptyState icon="restaurant-outline" title={t('food.emptyTitle')} body={t('food.emptyBody')} />
          </Card>
        ) : (
          MEAL_TYPES.map((mt) => {
            const list = logs.filter((l) => l.mealType === mt);
            if (!list.length) return null;
            return (
              <View key={mt} style={styles.group}>
                <AppText variant="label" color="secondary">
                  {mealLabel(t, mt)}
                </AppText>
                {list.map((l) => {
                  const tot = totals(l.items);
                  return (
                    <PressableScale key={l.id} style={styles.row} accessibilityRole="button" onPress={() => router.push({ pathname: '/food-entry', params: { id: l.id } })}>
                      <View style={styles.flex}>
                        <AppText variant="bodyStrong">{l.title}</AppText>
                        <AppText variant="caption" color="secondary">
                          {[l.time, tot.estimated ? t('common.kcal', { value: tot.kcal }) : t('items.noEstimate'), l.aiEstimated ? t('food.aiLabel') : null].filter(Boolean).join(' · ')}
                        </AppText>
                      </View>
                      <Icon name="chevron-forward" size={18} color={colors.textSecondary} />
                    </PressableScale>
                  );
                })}
              </View>
            );
          })
        )}
      </View>

      {logs.length ? <NutritionSummary totals={sum} /> : null}

      {finished && checks.food ? (
        <Card variant="inverse" style={styles.finished}>
          <Icon name="checkmark-circle" size={24} color={colors.white} />
          <View style={styles.flex}>
            <AppText variant="bodyStrong" color={colors.white}>
              {t('food.finished')}
            </AppText>
            <AppText variant="caption" color="#BDBDBD">
              {t('food.finishedHint')}
            </AppText>
          </View>
          <Button label={t('food.reopen')} size="sm" variant="outline" fullWidth={false} onPress={() => void save({ type: 'reopenFoodLog', date })} />
        </Card>
      ) : (
        <View style={styles.section}>
          {error && !logs.length ? <AppText variant="bodyStrong">{error}</AppText> : null}
          <Button label={isToday ? t('food.finish') : t('food.finishDate')} icon="checkmark-done" onPress={() => void finish()} variant={logs.length ? 'primary' : 'secondary'} />
        </View>
      )}

      <Button label={t('food.history')} variant="ghost" size="sm" onPress={() => router.push('/history/meals')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  actions: { gap: spacing.sm },
  scan: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, minHeight: 52, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white },
  section: { gap: spacing.sm },
  plannedCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
  logged: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  group: { gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.card, borderRadius: radii.md, padding: spacing.md },
  finished: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
