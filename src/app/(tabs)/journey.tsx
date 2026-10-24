import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { StatusPill } from '@/components/journey/StatusPill';
import { AppText, Card, Icon, PhotoHero, ProgressBar, Screen, SectionHeader } from '@/components/ui';
import {
  isJourneyComplete,
  JOURNEY_LENGTH,
  MILESTONE_DAYS,
  nextMilestone,
  PHASES,
  phaseProgress,
  phaseStatus,
  WEEK_COUNT,
  weekStatus,
} from '@/domain/journey';
import { useAppState } from '@/state/AppStateProvider';
import { useDashboard } from '@/state/selectors';
import { colors, imagery, palette, radii, spacing } from '@/theme';

export default function JourneyScreen() {
  const { t } = useTranslation();
  const { data, today } = useAppState();
  const { day, activeDays } = useDashboard();
  const complete = data.profile ? isJourneyComplete(data.profile.startDate, today) : false;
  const next = nextMilestone(day);

  return (
    <Screen inTabs title={t('journey.title')} subtitle={t('journey.subtitle')}>
      <Animated.View entering={FadeInDown.duration(450)}>
        <PhotoHero uri={imagery.home} height={210}>
          <View style={styles.heroRow}>
            <AppText variant="stat" color={colors.textOnPrimary}>
              {t('journey.day', { day })}
            </AppText>
            <AppText variant="subheading" color={colors.textOnPrimary} style={styles.ofTotal}>
              {t('journey.ofTotal', { total: JOURNEY_LENGTH })}
            </AppText>
          </View>
          <AppText variant="caption" color={colors.textOnPrimary}>
            {complete
              ? t('journey.complete')
              : [t('journey.activeDays', { count: activeDays }), next ? t('journey.nextMilestone', { day: next }) : null]
                  .filter(Boolean)
                  .join(' · ')}
          </AppText>
        </PhotoHero>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(80).duration(450)} style={styles.group}>
        <SectionHeader title={t('journey.milestonesTitle')} />
        <Card style={styles.milestones}>
          {MILESTONE_DAYS.map((m) => {
            const reached = day >= m;
            return (
              <View
                key={m}
                style={styles.milestone}
                accessible
                accessibilityLabel={`${t('journey.day', { day: m })}, ${t(`journey.milestones.d${m}`)}, ${t(
                  reached ? 'journey.status.done' : 'journey.status.upcoming',
                )}`}>
                <View style={[styles.milestoneDot, reached && styles.milestoneReached]}>
                  <Icon name={reached ? 'check' : 'flag'} size={16} color={reached ? colors.textOnPrimary : colors.textMuted} />
                </View>
                <AppText variant="label" align="center">
                  {t('journey.day', { day: m })}
                </AppText>
                <AppText variant="caption" color={colors.textMuted} align="center" numberOfLines={2}>
                  {t(`journey.milestones.d${m}`)}
                </AppText>
              </View>
            );
          })}
        </Card>
      </Animated.View>

      <View style={styles.group}>
        <SectionHeader title={t('journey.phasesTitle')} />
        {PHASES.map((phase, i) => {
          const status = phaseStatus(phase, day);
          return (
            <Animated.View key={phase.id} entering={FadeInDown.delay(140 + i * 80).duration(450)}>
              <Card style={[styles.phase, status === 'current' && styles.phaseCurrent]} elevated={status === 'current'}>
                <View style={styles.phaseHead}>
                  <View style={styles.flex}>
                    <AppText variant="overline" color={colors.textMuted}>
                      {t(`journey.phases.${phase.id}.range`)}
                    </AppText>
                    <AppText variant="heading">{t(`journey.phases.${phase.id}.name`)}</AppText>
                  </View>
                  <StatusPill status={status} />
                </View>
                <AppText variant="caption" color={colors.textSecondary}>
                  {t(`journey.phases.${phase.id}.description`)}
                </AppText>
                {status !== 'upcoming' ? <ProgressBar progress={phaseProgress(phase, day)} /> : null}
              </Card>
            </Animated.View>
          );
        })}
      </View>

      <View style={styles.group}>
        <SectionHeader title={t('journey.weeksTitle')} />
        <Card padded={false} style={styles.weeks}>
          {Array.from({ length: WEEK_COUNT }, (_, i) => i + 1).map((week) => {
            const status = weekStatus(week, day);
            return (
              <View key={week} style={[styles.week, status === 'current' && styles.weekCurrent]}>
                <View style={[styles.weekDot, status === 'done' && styles.milestoneReached, status === 'current' && styles.weekDotCurrent]}>
                  {status === 'done' ? (
                    <Icon name="check" size={14} color={colors.textOnPrimary} />
                  ) : (
                    <AppText variant="label" color={status === 'current' ? colors.text : colors.textMuted}>
                      {week}
                    </AppText>
                  )}
                </View>
                <View style={styles.flex}>
                  <AppText variant="label" color={colors.textMuted}>
                    {t('journey.week', { week })}
                  </AppText>
                  <AppText variant="bodyStrong" color={status === 'upcoming' ? colors.textSecondary : colors.text}>
                    {t(`journey.weeks.w${week}` as 'journey.weeks.w1')}
                  </AppText>
                </View>
                {status === 'current' ? <StatusPill status="current" /> : null}
              </View>
            );
          })}
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  group: { gap: spacing.sm },
  heroRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs },
  ofTotal: { marginBottom: 8 },
  milestones: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.xs },
  milestone: { flex: 1, alignItems: 'center', gap: spacing.xxs },
  milestoneDot: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxs,
  },
  milestoneReached: { backgroundColor: colors.primary, borderColor: colors.primary },
  phase: { gap: spacing.sm },
  phaseCurrent: { borderWidth: 2, borderColor: palette.peach },
  phaseHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  weeks: { overflow: 'hidden' },
  week: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  weekCurrent: { backgroundColor: palette.peachSoft },
  weekDot: {
    width: 30,
    height: 30,
    borderRadius: radii.pill,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDotCurrent: { backgroundColor: palette.peach },
});
