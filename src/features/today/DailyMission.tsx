import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { AppText, Icon, PressableScale, ProgressRing, type IconName } from '@/components/ui';
import { DAILY_TASKS, type DayChecks } from '@/domain/completion';
import { colors, radii, shadows, spacing } from '@/theme';

/**
 * The day's two tasks – food and activity – with a ring (0 %, 50 %, 100 %). When both are done the
 * ring closes and a check settles in: a quiet success state, no confetti, no pressure.
 * Status comes only from src/domain/completion.ts.
 */
export function DailyMission({ checks, isToday, onFood, onActivity }: { checks: DayChecks; isToday: boolean; onFood: () => void; onActivity: () => void }) {
  const { t } = useTranslation();
  const foodStatus = t(`today.status.${checks.foodStatus === 'done' ? 'done' : checks.foodStatus}`);
  const activityStatus = t(`today.status.${checks.activityStatus === 'open' ? 'open' : checks.activityStatus}`);
  const percent = Math.round((checks.done / DAILY_TASKS) * 100);

  return (
    <View style={styles.card} testID="daily-mission">
      <View style={styles.head}>
        <ProgressRing progress={checks.done / DAILY_TASKS} size={60} stroke={6}>
          {checks.complete ? (
            <Animated.View entering={ZoomIn.springify().damping(14)}>
              <Icon name="checkmark" size={26} color={colors.text} />
            </Animated.View>
          ) : (
            <AppText variant="label">{percent}%</AppText>
          )}
        </ProgressRing>
        <View style={styles.flex}>
          <AppText variant="subheading">{isToday ? t('today.mission') : t('today.missionPast')}</AppText>
          <AppText variant="caption" color="secondary" accessibilityLiveRegion="polite">
            {checks.complete ? t('today.dayCompleteShort') : t('today.missionProgress', { done: checks.done, total: DAILY_TASKS })}
          </AppText>
        </View>
      </View>
      <Task icon="restaurant-outline" label={t('today.tasks.food')} status={foodStatus} done={checks.food} onPress={onFood} />
      <Task icon={checks.activityStatus === 'rest' ? 'moon-outline' : 'barbell-outline'} label={t('today.tasks.activity')} status={activityStatus} done={checks.activity} onPress={onActivity} />
      {checks.complete && isToday ? (
        <Animated.View entering={FadeIn.duration(500)} style={styles.success}>
          <AppText variant="caption" color="secondary">
            {t('today.dayCompleteNote')}
          </AppText>
        </Animated.View>
      ) : null}
    </View>
  );
}

function Task({ icon, label, status, done, onPress }: { icon: IconName; label: string; status: string; done: boolean; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label}: ${status}`} accessibilityState={{ checked: done }} style={styles.task}>
      <View style={[styles.taskIcon, done && styles.taskIconDone]}>
        <Icon name={icon} size={18} color={done ? colors.white : colors.text} />
      </View>
      <View style={styles.flex}>
        <AppText variant="bodyStrong">{label}</AppText>
        <AppText variant="caption" color="secondary">
          {status}
        </AppText>
      </View>
      {done ? <Icon name="checkmark-circle" size={22} color={colors.text} /> : <Icon name="chevron-forward" size={18} color={colors.textSecondary} />}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing.lg, gap: spacing.sm, ...shadows.card },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xxs },
  flex: { flex: 1, gap: 2 },
  task: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 52 },
  taskIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  taskIconDone: { backgroundColor: colors.black },
  success: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: spacing.sm },
});
