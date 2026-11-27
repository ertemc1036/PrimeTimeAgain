import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Icon, PressableScale } from '@/components/ui';
import type { BriefingPart } from '@/domain/briefing';
import { activitySummary } from '@/features/labels';
import { PrimeAvatar } from '@/features/prime/PrimeAvatar';
import { colors, radii, spacing } from '@/theme';

/** Prime's short note for today, built from saved data (src/domain/briefing.ts). Tapping opens the chat. */
export function PrimeBriefing({ parts }: { parts: BriefingPart[] }) {
  const { t } = useTranslation();
  const text = parts
    .map((p) => {
      switch (p.key) {
        case 'greeting':
          return t(`today.briefing.${p.period}`);
        case 'trainingPlanned':
          return t('today.briefing.trainingPlanned', { activity: activitySummary(t, p.activity) });
        case 'trainingDone':
          return t('today.briefing.trainingDone', { minutes: p.minutes });
        case 'mealsOpen':
          return t('today.briefing.mealsOpen', { count: p.count });
        default:
          return t(`today.briefing.${p.key}`);
      }
    })
    .join(' ');

  return (
    <PressableScale
      onPress={() => router.navigate('/prime')}
      accessibilityRole="button"
      accessibilityLabel={`${t('brand.agent')}: ${text}`}
      accessibilityHint={t('today.prime.open')}
      style={styles.card}
      testID="prime-card">
      <PrimeAvatar size={40} />
      <View style={styles.flex}>
        <AppText variant="label" color={colors.primaryDeep}>
          {t('brand.agent')}
        </AppText>
        <AppText variant="body">{text}</AppText>
      </View>
      <Icon name="chevron-forward" size={18} color={colors.textSecondary} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryLight,
    borderWidth: 1,
    borderRadius: radii.xl,
    padding: spacing.md,
  },
  flex: { flex: 1, gap: 2 },
});
