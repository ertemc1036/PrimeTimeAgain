import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Card, EmptyState, Glyph, Icon, PressableScale, ProgressBar, ProgressRing, Screen, SectionHeader } from '@/components/ui';
import { AREA_ICONS } from '@/domain/catalog';
import { areaProgress, goalProgress, totals } from '@/domain/progress';
import { AREAS, type AreaId } from '@/domain/types';
import { goalTitle } from '@/i18n/content';
import { useAppState } from '@/state/AppStateProvider';
import { activeGoals, goalGlyph } from '@/state/selectors';
import { radii, spacing, useColors } from '@/theme';

export default function AreaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const area = (AREAS.includes(id as AreaId) ? id : 'body') as AreaId;
  const { t } = useTranslation();
  const colors = useColors();
  const { data, today } = useAppState();
  const program = data.program!;
  const goals = activeGoals(data.goals).filter((g) => g.area === area);
  const tally = areaProgress(area, data.goals, program, data.days, today);

  return (
    <Screen back="back" eyebrow={t('area.followThrough')} title={t(`areas.${area}`)} subtitle={t(`areas.descriptions.${area}`)}>
      <Card variant="inverse" style={styles.hero}>
        <ProgressRing progress={(tally.percent ?? 0) / 100} size={104} stroke={6} color={colors.onAccent} track="rgba(127,127,127,0.35)">
          <Glyph name={AREA_ICONS[area]} size={22} color={colors.onAccent} />
          <AppText variant="heading" color={colors.onAccent}>
            {tally.percent === null ? '–' : t('common.percent', { value: tally.percent })}
          </AppText>
        </ProgressRing>
        <View style={styles.flex}>
          <AppText variant="overline" color={colors.onAccent} style={styles.dim}>
            {t('area.followThrough')}
          </AppText>
          <AppText variant="title" color={colors.onAccent}>
            {`${tally.done}/${tally.planned}`}
          </AppText>
          <AppText variant="caption" color={colors.onAccent} style={styles.dim}>
            {t('goal.progressCaption')}
          </AppText>
        </View>
      </Card>

      <SectionHeader title={t('area.goals')} />
      {goals.length === 0 ? (
        <Card>
          <EmptyState icon="target" title={t('area.noGoals')} action={t('control.addGoal')} onAction={() => router.push('/goals')} />
        </Card>
      ) : (
        goals.map((g, i) => {
          const gp = goalProgress(g, program, data.days, today);
          const done = totals(data.days, g.id).missionsDone;
          return (
            <Animated.View key={g.id} entering={FadeInDown.delay(i * 70).duration(400)}>
              <PressableScale
                onPress={() => router.push({ pathname: '/goal/[id]', params: { id: g.id } })}
                accessibilityRole="button"
                accessibilityLabel={`${goalTitle(t, g)}, ${gp.percent === null ? '–' : t('common.percent', { value: gp.percent })}`}
                style={[styles.goal, { backgroundColor: colors.surface }]}>
                <View style={[styles.glyph, { backgroundColor: colors.background }]}>
                  <Glyph name={goalGlyph(g)} size={20} />
                </View>
                <View style={styles.flex}>
                  <AppText variant="subheading">{goalTitle(t, g)}</AppText>
                  <AppText variant="caption" color="secondary">
                    {t('area.missionsDone', { count: done })}
                  </AppText>
                  <View style={styles.bar}>
                    <ProgressBar progress={(gp.percent ?? 0) / 100} />
                  </View>
                </View>
                <AppText variant="heading">{gp.percent === null ? '–' : t('common.percent', { value: gp.percent })}</AppText>
                <Icon name="chevron-right" size={18} color={colors.textSecondary} />
              </PressableScale>
            </Animated.View>
          );
        })
      )}
      <Button label={t('control.addGoal')} variant="secondary" icon="plus" size="md" onPress={() => router.push('/goals')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, padding: spacing.lg },
  dim: { opacity: 0.7 },
  goal: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radii.md },
  glyph: { width: 44, height: 44, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  bar: { marginTop: spacing.xs },
});
