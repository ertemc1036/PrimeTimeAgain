import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Card } from '@/components/ui';
import { useAppState } from '@/state/AppStateProvider';
import { colors, radii, spacing } from '@/theme';
import { newId, nowISO } from '@/utils/id';

import { DEFAULT_WATER_GOAL_ML } from '@/domain/daySummary';

/** Today's water: quick add, remove the last entry, progress towards the personal guide value. */
export function WaterCard() {
  const { t } = useTranslation();
  const { data, today, dispatch } = useAppState();
  const entries = data.water.filter((w) => w.date === today);
  const total = entries.reduce((s, w) => s + w.ml, 0);
  const goal = data.profile?.waterGoalMl ?? DEFAULT_WATER_GOAL_ML;
  const ratio = Math.min(total / goal, 1);
  const last = [...entries].sort((a, b) => (a.at < b.at ? 1 : -1))[0];
  const add = (ml: number) => void dispatch({ type: 'addWater', log: { id: newId('water'), date: today, ml, at: nowISO(), source: 'manual', createdAt: nowISO() } });

  return (
    <Card variant="elevated" style={styles.card} testID="water-card">
      <View style={styles.head}>
        <AppText variant="subheading">{t('water.title')}</AppText>
        <AppText variant="bodyStrong" accessibilityLiveRegion="polite">
          {t('water.progress', { total: (total / 1000).toFixed(2).replace(/\.?0+$/, ''), goal: (goal / 1000).toFixed(1).replace(/\.0$/, '') })}
        </AppText>
      </View>
      <View style={styles.track} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={[styles.fill, { width: `${Math.round(ratio * 100)}%` }]} />
      </View>
      <View style={styles.buttons}>
        <Button label="+250 ml" size="sm" variant="secondary" fullWidth={false} onPress={() => add(250)} accessibilityHint={t('water.addHint', { ml: 250 })} />
        <Button label="+500 ml" size="sm" variant="secondary" fullWidth={false} onPress={() => add(500)} accessibilityHint={t('water.addHint', { ml: 500 })} />
        {last ? <Button label={t('water.removeLast', { ml: last.ml })} size="sm" variant="ghost" fullWidth={false} onPress={() => void dispatch({ type: 'deleteWater', id: last.id })} /> : null}
      </View>
      <AppText variant="caption" color="secondary">
        {t('water.goalNote')}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  track: { height: 10, borderRadius: radii.pill, backgroundColor: colors.primarySoft, overflow: 'hidden' },
  fill: { height: 10, borderRadius: radii.pill, backgroundColor: colors.primary },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
