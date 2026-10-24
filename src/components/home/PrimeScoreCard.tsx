import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Card, Icon, ProgressBar, ProgressRing } from '@/components/ui';
import { scoreLevel, type PrimeScore } from '@/domain/primeScore';
import { PILLARS } from '@/domain/types';
import { colors, pillarColors, spacing } from '@/theme';

export function PrimeScoreCard({ score }: { score: PrimeScore }) {
  const { t } = useTranslation();
  const level = scoreLevel(score.score);
  const levelLabel = t(`primeScore.levels.${level}`);

  return (
    <Card style={styles.card}>
      <View style={styles.top}>
        <View
          accessible
          accessibilityRole="image"
          accessibilityLabel={
            score.score === null
              ? t('a11y.primeScoreEmpty')
              : t('a11y.primeScore', { score: score.score, level: levelLabel })
          }>
          <ProgressRing progress={(score.score ?? 0) / 100} size={128} stroke={11}>
            <AppText variant="stat" color={colors.text}>
              {score.score ?? '–'}
            </AppText>
            <AppText variant="caption" color={colors.textMuted}>
              {t('primeScore.outOf')}
            </AppText>
          </ProgressRing>
        </View>
        <View style={styles.copy}>
          <AppText variant="overline" color={colors.primaryText}>
            {t('primeScore.title')}
          </AppText>
          <AppText variant="heading">{levelLabel}</AppText>
          <AppText variant="caption" color={colors.textSecondary}>
            {t(`primeScore.messages.${level}`)}
          </AppText>
        </View>
      </View>

      <View style={styles.pillars}>
        {PILLARS.map((p) => {
          const part = score.byPillar[p];
          if (part.planned === 0) return null;
          return (
            <View key={p} style={styles.pillar}>
              <View style={styles.pillarHead}>
                <AppText variant="label">{t(`pillars.${p}.name`)}</AppText>
                <AppText variant="label" color={colors.textMuted}>
                  {part.score ?? 0}
                </AppText>
              </View>
              <ProgressBar progress={(part.score ?? 0) / 100} color={pillarColors[p].strong} track={pillarColors[p].soft} />
            </View>
          );
        })}
      </View>

      <Pressable
        onPress={() => router.push('/prime-score')}
        accessibilityRole="button"
        hitSlop={8}
        style={styles.link}>
        <Icon name="info" size={16} color={colors.primaryText} />
        <AppText variant="label" color={colors.primaryText}>
          {t('primeScore.learnMore')}
        </AppText>
        <AppText variant="caption" color={colors.textMuted} style={styles.caption}>
          {t('primeScore.caption')}
        </AppText>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.lg },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  copy: { flex: 1, gap: spacing.xxs },
  pillars: { flexDirection: 'row', gap: spacing.md },
  pillar: { flex: 1, gap: spacing.xs },
  pillarHead: { flexDirection: 'row', justifyContent: 'space-between' },
  link: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  caption: { flexBasis: '100%' },
});
