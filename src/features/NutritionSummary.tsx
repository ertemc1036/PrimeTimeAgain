import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Card } from '@/components/ui';
import type { NutritionTotals } from '@/domain/nutrition';
import { spacing } from '@/theme';

/** Estimated totals. Items without an estimate are excluded and counted, never shown as zero. */
export function NutritionSummary({ totals }: { totals: NutritionTotals }) {
  const { t } = useTranslation();
  const cells = [
    { label: t('food.kcal'), value: `${totals.kcal}` },
    { label: t('food.protein'), value: `${totals.protein} g` },
    { label: t('food.carbs'), value: `${totals.carbs} g` },
    { label: t('food.fat'), value: `${totals.fat} g` },
  ];
  return (
    <Card>
      <AppText variant="label" color="secondary">
        {t('food.totals')}
      </AppText>
      <View style={styles.row}>
        {cells.map((c) => (
          <View key={c.label} style={styles.cell}>
            <AppText variant="heading">{totals.estimated ? c.value : '—'}</AppText>
            <AppText variant="label" color="secondary">
              {c.label}
            </AppText>
          </View>
        ))}
      </View>
      {totals.missing ? (
        <AppText variant="caption" color="secondary">
          {t('food.partial', { count: totals.missing })}
        </AppText>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm, marginBottom: spacing.xs },
  cell: { gap: 2 },
});
