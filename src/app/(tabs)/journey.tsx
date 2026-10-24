import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Card, Icon, ProgressBar, Screen, SectionHeader, StatTile } from '@/components/ui';
import { milestones, phases, stageStatus, weekCount, weekTheme, type Milestone } from '@/domain/program';
import { totals, weeklyTallies } from '@/domain/progress';
import { useAppState } from '@/state/AppStateProvider';
import { useProgramInfo, useStreak } from '@/state/selectors';
import { radii, spacing, status, useColors } from '@/theme';

const milestoneKey = (m: Milestone) =>
  m.kind === 'phase' ? (`journey.milestone.phase_${m.phase}` as 'journey.milestone.phase_reset') : (`journey.milestone.${m.kind}` as 'journey.milestone.start');

export default function JourneyScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const { data, today, dispatch } = useAppState();
  const info = useProgramInfo();
  const streak = useStreak();
  if (!info) return null;
  const { program, day, complete } = info;
  const percent = Math.round((Math.min(info.rawDay, program.durationDays) / program.durationDays) * 100);
  const tot = totals(data.days);
  const weekTallies = new Map(weeklyTallies(program, data.days, today).map((w) => [w.week, w.tally]));
  const currentWeek = Math.ceil(day / 7);

  return (
    <Screen inTabs title={t('journey.title')} subtitle={t('journey.subtitle', { days: program.durationDays })}>
      <Animated.View entering={FadeInDown.duration(400)}>
        <Card variant="inverse" style={styles.hero}>
          <AppText variant="overline" color={colors.onAccent} style={styles.dim}>
            {t('common.dayOf', { day, total: program.durationDays })}
          </AppText>
          <AppText variant="hero" color={colors.onAccent}>
            {`${day}/${program.durationDays}`}
          </AppText>
          <ProgressBar progress={percent / 100} color={colors.onAccent} track="rgba(127,127,127,0.35)" height={6} />
          <AppText variant="caption" color={colors.onAccent} style={styles.dim}>
            {t('journey.progress', { percent })}
          </AppText>
        </Card>
      </Animated.View>

      {complete ? (
        <Card variant="outline" style={styles.complete}>
          <AppText variant="heading">{t('journey.completeTitle')}</AppText>
          <AppText variant="caption" color="secondary">
            {t('journey.completeBody')}
          </AppText>
          <Button
            label={t('journey.extend')}
            size="md"
            variant="secondary"
            onPress={() => void dispatch({ type: 'updateProgram', patch: { durationDays: program.durationDays + 30 } }).catch(() => undefined)}
          />
        </Card>
      ) : null}

      <SectionHeader title={t('journey.phases')} />
      <View>
        {phases(program.durationDays).map((p, i, all) => {
          const st = stageStatus(p.startDay, p.endDay, day);
          return (
            <Animated.View key={p.id} entering={FadeInDown.delay(80 + i * 90).duration(400)} style={styles.phaseRow}>
              <View style={styles.rail}>
                <View
                  style={[
                    styles.node,
                    st === 'done' && { backgroundColor: colors.accent, borderColor: colors.accent },
                    st === 'current' && { borderColor: colors.accent, borderWidth: 3 },
                    st === 'upcoming' && { borderColor: colors.border },
                  ]}>
                  {st === 'done' ? <Icon name="check" size={14} color={colors.onAccent} /> : null}
                </View>
                {i < all.length - 1 ? <View style={[styles.line, { backgroundColor: st === 'done' ? colors.accent : colors.border }]} /> : null}
              </View>
              <Card variant={st === 'current' ? 'inverse' : 'filled'} style={[styles.phase, st === 'upcoming' && styles.upcoming]}>
                <View style={styles.phaseHead}>
                  <AppText variant="title" color={st === 'current' ? colors.onAccent : undefined} style={styles.flex}>
                    {t(`journey.phase.${p.id}.name`)}
                  </AppText>
                  <AppText variant="overline" color={st === 'current' ? colors.onAccent : 'secondary'}>
                    {t(`journey.status.${st}`)}
                  </AppText>
                </View>
                <AppText variant="label" color={st === 'current' ? colors.onAccent : 'secondary'}>
                  {t('journey.range', { start: p.startDay, end: p.endDay })}
                </AppText>
                <AppText variant="caption" color={st === 'current' ? colors.onAccent : 'secondary'}>
                  {t(`journey.phase.${p.id}.body`)}
                </AppText>
                {st === 'current' ? (
                  <ProgressBar progress={(day - p.startDay + 1) / (p.endDay - p.startDay + 1)} color={colors.onAccent} track="rgba(127,127,127,0.35)" />
                ) : null}
              </Card>
            </Animated.View>
          );
        })}
      </View>

      <SectionHeader title={t('journey.milestones')} />
      <Card padded={false}>
        {milestones(program.durationDays).map((m, i) => {
          const reached = day >= m.day;
          return (
            <View
              key={m.day}
              style={[styles.milestone, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
              accessible
              accessibilityLabel={`${t('common.dayOf', { day: m.day, total: program.durationDays })}, ${t(milestoneKey(m))}, ${t(reached ? 'journey.status.done' : 'journey.status.upcoming')}`}>
              <View style={[styles.mNode, reached ? { backgroundColor: status.prime, borderColor: status.prime } : { borderColor: colors.border }]}>
                <Icon name={reached ? 'check' : 'flag'} size={15} color={reached ? '#08090B' : colors.textSecondary} />
              </View>
              <AppText variant="bodyStrong" style={styles.flex}>
                {t(milestoneKey(m))}
              </AppText>
              <AppText variant="label" color="secondary">
                {t('common.dayOf', { day: m.day, total: program.durationDays })}
              </AppText>
            </View>
          );
        })}
      </Card>

      <SectionHeader title={t('journey.weekly')} />
      <Card padded={false}>
        {Array.from({ length: weekCount(program.durationDays) }, (_, i) => i + 1).map((week) => {
          const st = week < currentWeek ? 'done' : week === currentWeek ? 'current' : 'upcoming';
          const tally = weekTallies.get(week);
          return (
            <View
              key={week}
              style={[styles.week, { borderBottomColor: colors.border }, st === 'current' && { backgroundColor: colors.accent }]}>
              <AppText variant="label" color={st === 'current' ? colors.onAccent : 'secondary'} style={styles.weekNum}>
                {t('journey.week', { week })}
              </AppText>
              <AppText variant="bodyStrong" color={st === 'current' ? colors.onAccent : st === 'upcoming' ? 'secondary' : undefined} style={styles.flex}>
                {t(`journey.weeks.w${weekTheme(week, program.durationDays)}` as 'journey.weeks.w1')}
              </AppText>
              {st !== 'upcoming' && tally?.percent !== null && tally ? (
                <AppText variant="label" color={st === 'current' ? colors.onAccent : undefined}>
                  {t('common.percent', { value: tally.percent })}
                </AppText>
              ) : null}
            </View>
          );
        })}
      </Card>

      <SectionHeader title={t('journey.achievements')} />
      <View style={styles.stats}>
        <StatTile value={String(tot.missionsDone)} label={t('journey.missionsDone')} />
        <StatTile value={String(tot.minutesInvested)} label={t('journey.minutes')} />
      </View>
      <View style={styles.stats}>
        <StatTile value={String(streak.primeDays)} label={t('journey.primeDays')} />
        <StatTile value={String(streak.longest)} label={t('journey.longestStreak')} />
      </View>
      <Button label={t('journey.openCalendar')} icon="calendar" variant="secondary" onPress={() => router.push('/calendar')} />
      <AppText variant="caption" color="secondary">
        {t('journey.honesty')}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  dim: { opacity: 0.7 },
  hero: { gap: spacing.sm, padding: spacing.lg },
  complete: { gap: spacing.sm },
  phaseRow: { flexDirection: 'row', gap: spacing.sm },
  rail: { width: 24, alignItems: 'center' },
  node: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: spacing.md },
  line: { width: 2, flex: 1, marginVertical: 4 },
  phase: { flex: 1, gap: spacing.xs, marginBottom: spacing.sm },
  upcoming: { opacity: 0.75 },
  phaseHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  milestone: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, minHeight: 56 },
  mNode: { width: 36, height: 36, borderRadius: radii.pill, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  week: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, minHeight: 52 },
  weekNum: { width: 72 },
  stats: { flexDirection: 'row', gap: spacing.xs },
});
