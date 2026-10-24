import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { ReflectionCard } from '@/components/progress/ReflectionCard';
import { WeekChart } from '@/components/progress/WeekChart';
import { AppText, Button, Card, EmptyState, ProgressBar, Screen, SectionHeader } from '@/components/ui';
import { PILLARS } from '@/domain/types';
import { useAppState } from '@/state/AppStateProvider';
import { useDashboard } from '@/state/selectors';
import { colors, pillarColors, spacing } from '@/theme';

export default function ProgressScreen() {
  const { t } = useTranslation();
  const { data, today } = useAppState();
  const { week, score, day, activeDays, totalCheckIns } = useDashboard();
  const hasData = totalCheckIns > 0;

  const stats = [
    { label: t('progress.stats.activeDays'), value: activeDays },
    { label: t('progress.stats.checkIns'), value: totalCheckIns },
    { label: t('progress.stats.journeyDay'), value: day },
  ];

  return (
    <Screen inTabs title={t('progress.title')} subtitle={t('progress.subtitle')}>
      <Animated.View entering={FadeInDown.duration(400)} style={styles.stats}>
        {stats.map((s) => (
          <Card key={s.label} style={styles.stat} accessible accessibilityLabel={`${s.label}: ${s.value}`}>
            <AppText variant="title">{String(s.value)}</AppText>
            <AppText variant="caption" color={colors.textSecondary} numberOfLines={2}>
              {s.label}
            </AppText>
          </Card>
        ))}
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(80).duration(400)}>
        <Card style={styles.card}>
          <View>
            <AppText variant="heading">{t('progress.weekTitle')}</AppText>
            <AppText variant="caption" color={colors.textSecondary}>
              {t('progress.weekCaption')}
            </AppText>
          </View>
          {hasData ? (
            <WeekChart days={week} today={today} />
          ) : (
            <EmptyState icon="bar-chart-2" title={t('progress.noData.title')} body={t('progress.noData.body')} />
          )}
        </Card>
      </Animated.View>

      {hasData ? (
        <Animated.View entering={FadeInDown.delay(160).duration(400)}>
          <Card style={styles.card}>
            <AppText variant="heading">{t('progress.pillarsTitle')}</AppText>
            {PILLARS.filter((p) => score.byPillar[p].planned > 0).map((p) => (
              <View key={p} style={styles.pillar}>
                <View style={styles.pillarHead}>
                  <AppText variant="bodyStrong">{t(`pillars.${p}.name`)}</AppText>
                  <AppText variant="caption" color={colors.textSecondary}>
                    {`${score.byPillar[p].completed}/${score.byPillar[p].planned}`}
                  </AppText>
                </View>
                <ProgressBar
                  progress={(score.byPillar[p].score ?? 0) / 100}
                  color={pillarColors[p].strong}
                  track={pillarColors[p].soft}
                  height={10}
                />
              </View>
            ))}
          </Card>
        </Animated.View>
      ) : null}

      <View style={styles.group}>
        <SectionHeader title={t('progress.reflectionsTitle')} action={t('progress.newReflection')} onAction={() => router.push('/reflection')} />
        {data.reflections.length === 0 ? (
          <Card>
            <EmptyState
              icon="book"
              title={t('progress.noReflections.title')}
              body={t('progress.noReflections.body')}
              action={t('progress.newReflection')}
              onAction={() => router.push('/reflection')}
            />
          </Card>
        ) : (
          <>
            {data.reflections.slice(0, 10).map((r) => (
              <ReflectionCard key={r.id} reflection={r} />
            ))}
            <Button label={t('progress.newReflection')} variant="secondary" icon="plus" onPress={() => router.push('/reflection')} />
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: spacing.sm },
  stat: { flex: 1, gap: spacing.xxs, paddingVertical: spacing.md, paddingHorizontal: spacing.md },
  card: { gap: spacing.lg },
  pillar: { gap: spacing.xs },
  pillarHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  group: { gap: spacing.sm },
});
