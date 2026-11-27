import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Icon, ProgressRing } from '@/components/ui';
import type { NutritionTotals } from '@/domain/nutrition';
import type { NutritionTargets } from '@/domain/types';
import { useLocale } from '@/i18n/useLanguage';
import { colors, fonts, radii, shadows, spacing } from '@/theme';

/**
 * Calories of the day plus the three macros. Logged values are estimates; when meals exist but none
 * has an estimate, values show "–" instead of a misleading 0. Targets appear only when the user has
 * confirmed a nutrition frame (profile.targets).
 */
export function NutritionCard({
  totals,
  mealsLogged,
  targets,
  action,
}: {
  totals: NutritionTotals;
  mealsLogged: number;
  targets: NutritionTargets | null;
  action?: { label: string; onPress: () => void };
}) {
  const { t } = useTranslation();
  const locale = useLocale();
  const fmt = (n: number) => Math.round(n).toLocaleString(locale);
  const known = totals.estimated > 0 || mealsLogged === 0;
  const left = targets && known ? targets.kcal - totals.kcal : null;

  return (
    <View style={styles.wrap}>
      <View style={styles.card} testID="nutrition-card">
        <View style={styles.flex}>
          <AppText variant="label" color="secondary">
            {t('today.nutrition.title')}
          </AppText>
          <View style={styles.kcalRow}>
            {known ? <AppText style={styles.kcal}>{fmt(totals.kcal)}</AppText> : <AppText variant="heading">{t('items.noEstimate')}</AppText>}
            <AppText variant="bodyStrong" color="secondary">
              {targets ? t('today.nutrition.ofTarget', { kcal: fmt(targets.kcal) }) : 'kcal'}
            </AppText>
          </View>
          <AppText variant="caption" color="secondary">
            {left === null ? t('today.nutrition.logged') : left >= 0 ? t('today.nutrition.left', { kcal: fmt(left) }) : t('today.nutrition.over', { kcal: fmt(-left) })}
          </AppText>
          {totals.missing ? (
            <AppText variant="caption" color="secondary">
              {t('food.partial', { count: totals.missing })}
            </AppText>
          ) : null}
          {action ? (
            <View style={styles.action}>
              <Button label={action.label} icon="add" size="sm" fullWidth={false} onPress={action.onPress} />
            </View>
          ) : null}
        </View>
        {targets ? (
          <ProgressRing progress={known ? totals.kcal / targets.kcal : 0} size={92} stroke={9}>
            <Icon name="flame-outline" size={24} color={colors.text} />
          </ProgressRing>
        ) : (
          <View style={styles.flame}>
            <Icon name="flame-outline" size={26} color={colors.text} />
          </View>
        )}
      </View>

      <View style={styles.macros}>
        {(['protein', 'carbs', 'fat'] as const).map((k) => (
          <View key={k} style={styles.macro} accessible accessibilityLabel={`${t(`food.${k}`)}: ${known ? `${Math.round(totals[k])} g` : '–'}${targets ? ` / ${targets[k]} g` : ''}`}>
            {targets ? (
              <ProgressRing progress={known ? totals[k] / Math.max(1, targets[k]) : 0} size={34} stroke={4}>
                <View />
              </ProgressRing>
            ) : null}
            <AppText variant="subheading" style={styles.tabular}>
              {known ? `${Math.round(totals[k])} g` : '–'}
            </AppText>
            <AppText variant="caption" color="secondary" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
              {targets ? `${t(`food.short.${k}`)} · ${targets[k]} g` : t(`food.short.${k}`)}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    ...shadows.card,
  },
  flex: { flex: 1, gap: 2 },
  kcalRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' },
  kcal: { fontFamily: fonts.extrabold, fontSize: 40, lineHeight: 46, letterSpacing: -1.2, color: colors.text, fontVariant: ['tabular-nums'] },
  action: { marginTop: spacing.sm, alignSelf: 'flex-start' },
  flame: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  macros: { flexDirection: 'row', gap: spacing.sm },
  macro: { flex: 1, backgroundColor: colors.surface, borderRadius: radii.lg, paddingVertical: spacing.md, paddingHorizontal: spacing.sm, gap: 4, ...shadows.soft },
  tabular: { fontVariant: ['tabular-nums'] },
});
