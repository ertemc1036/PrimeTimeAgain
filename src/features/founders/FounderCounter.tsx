import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Card } from '@/components/ui';
import { formatInteger } from '@/i18n/format';
import { useLocale } from '@/i18n/useLanguage';
import type { FounderStatus } from '@/services/founders';
import { colors, radii, spacing } from '@/theme';

/** "742 of 1,000 free Pro seats taken" with a progress bar. Only real server numbers are shown. */
export function FounderCounter({ status }: { status: FounderStatus }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const full = status.remaining === 0;
  const ratio = status.capacity ? Math.min(status.taken / status.capacity, 1) : 1;
  return (
    <Card style={styles.card} testID="founder-counter">
      <AppText variant="label" color="secondary">
        {t('pro.founders.title')}
      </AppText>
      <AppText variant="bodyStrong" accessibilityLiveRegion="polite">
        {full
          ? t('pro.founders.full', { capacity: formatInteger(status.capacity, locale) })
          : t('pro.founders.counter', { taken: formatInteger(status.taken, locale), capacity: formatInteger(status.capacity, locale) })}
      </AppText>
      <View style={styles.track} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={[styles.fill, { width: `${Math.round(ratio * 100)}%` }]} />
      </View>
      {!full ? <AppText variant="caption">{t('pro.founders.body', { capacity: formatInteger(status.capacity, locale) })}</AppText> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.xs },
  track: { height: 6, borderRadius: radii.pill, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: 6, backgroundColor: colors.text },
});
