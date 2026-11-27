import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Card, Icon, PressableScale, ProgressRing, Screen, useToast } from '@/components/ui';
import { dayChecks, streakStats } from '@/domain/completion';
import { addDays } from '@/domain/dates';
import { gymDay, kitchenDay, waterDay } from '@/domain/daySummary';
import { BodyHero } from '@/features/avatar/BodyHero';
import { activityLabel, activitySummary, mealLabel } from '@/features/labels';
import { MissionCard } from '@/features/MissionCard';
import { PrimeBadge } from '@/features/prime/PrimeBadge';
import { StreakCalendar } from '@/features/StreakCalendar';
import { DashboardCard, MetricTile } from '@/features/today/DashboardCard';
import { WaterCard } from '@/features/WaterCard';
import { formatDate } from '@/i18n/format';
import { useLocale } from '@/i18n/useLanguage';
import { useAppState } from '@/state/AppStateProvider';
import { colors, radii, spacing } from '@/theme';
import { currentHour } from '@/utils/id';

const liters = (ml: number) => (ml / 1000).toFixed(1).replace(/\.0$/, '');

/** Today: the central dashboard. Everything shown is read from saved data; cards open Kitchen, Gym, Prime or Journey. */
export default function Today() {
  const { t } = useTranslation();
  const locale = useLocale();
  const { data, today } = useAppState();
  const toast = useToast();
  const checks = dayChecks(data, today);
  const streak = streakStats(data, today);
  const tomorrow = addDays(today, 1);
  const kitchen = kitchenDay(data, today);
  const gym = gymDay(data, today);
  const water = waterDay(data, today);
  const lastPrime = [...data.coach.messages].reverse().find((m) => m.role === 'assistant')?.content;

  const hour = currentHour();
  const greetingKey = hour < 12 ? 'today.morning' : hour < 18 ? 'today.afternoon' : 'today.evening';

  // Celebrate once when the third task completes during this session.
  const prevDone = useRef(checks.done);
  useEffect(() => {
    if (checks.complete && prevDone.current < 3) toast(t('today.complete.title'), 'trophy-outline');
    prevDone.current = checks.done;
  }, [checks.complete, checks.done, toast, t]);

  const n = kitchen.nutrition;
  const openMeals = kitchen.openMeals.map((m) => `${m.title} (${mealLabel(t, m.mealType)})`).join(', ');

  return (
    <Screen inTabs>
      {/* Greeting and day status */}
      <View style={styles.greeting}>
        <AppText variant="label" color="secondary">
          {formatDate(today, locale, { weekday: 'long', day: 'numeric', month: 'long' })}
        </AppText>
        <AppText variant="title" accessibilityRole="header">
          {t(greetingKey, { name: data.profile?.name ?? '' })}
        </AppText>
        <View style={[styles.status, checks.complete && styles.statusDone]}>
          <Icon name={checks.complete ? 'checkmark-circle' : 'ellipse-outline'} size={14} color={checks.complete ? colors.black : colors.primaryDeep} />
          <AppText variant="label">{checks.complete ? t('today.complete.title') : t('today.progress', { done: checks.done })}</AppText>
        </View>
      </View>

      {/* Prime hint: light card, black text, baby-blue accent */}
      <PressableScale onPress={() => router.navigate('/prime')} accessibilityRole="button" accessibilityLabel={t('today.prime.open')}>
        <Card variant="accent" style={styles.prime} testID="prime-card">
          <PrimeBadge size={44} />
          <View style={styles.flex}>
            <AppText variant="label" color={colors.primaryDeep}>
              {t('brand.agent')}
            </AppText>
            <AppText variant="bodyStrong" numberOfLines={3}>
              {lastPrime ?? t('today.prime.prompt')}
            </AppText>
          </View>
          <Icon name="chevron-forward" size={18} color={colors.textSecondary} />
        </Card>
      </PressableScale>

      {/* Key numbers of the day */}
      <View style={styles.metrics}>
        <MetricTile icon="flame-outline" label={t('today.stats.kcal')} value={n.estimated || !kitchen.mealsLogged ? String(n.kcal) : '–'} onPress={() => router.navigate('/kitchen')} />
        <MetricTile icon="water-outline" label={t('today.stats.water')} value={`${liters(water.ml)} / ${liters(water.goalMl)} l`} />
        <MetricTile icon="barbell-outline" label={t('today.stats.training')} value={gym.rest && !gym.minutes ? '–' : t('common.min', { count: gym.minutes })} onPress={() => router.navigate('/gym')} />
      </View>

      {/* Daily mission */}
      <Card variant="elevated" style={styles.mission}>
        <View style={styles.missionHead}>
          <ProgressRing progress={checks.done / 3} size={64} stroke={7} color={colors.primary} track={colors.primarySoft}>
            <AppText variant="bodyStrong">{checks.done}/3</AppText>
          </ProgressRing>
          <View style={styles.flex}>
            <AppText variant="subheading">{t('today.mission')}</AppText>
            <AppText variant="caption" color="secondary">
              {checks.complete ? t('today.complete.body') : t('today.subtitle')}
            </AppText>
          </View>
        </View>
        <MissionCard
          icon="restaurant-outline"
          done={checks.food}
          title={checks.food ? t('today.food.done') : t('today.food.pending')}
          hint={checks.food ? t('today.food.doneHint', { count: kitchen.mealsLogged }) : t('today.food.pendingHint')}
          onPress={() => router.navigate('/kitchen')}
        />
        <MissionCard
          icon={gym.rest ? 'moon-outline' : 'barbell-outline'}
          done={checks.activity}
          title={checks.activity ? (gym.rest ? t('today.activity.rest') : t('today.activity.done')) : t('today.activity.pending')}
          hint={checks.activity ? undefined : gym.planned ? activitySummary(t, gym.planned) : t('today.activity.pendingHint')}
          onPress={() => router.navigate('/gym')}
        />
        <MissionCard
          icon="calendar-outline"
          done={checks.planning}
          title={checks.planning ? t('today.planning.done') : t('today.planning.pending')}
          hint={checks.planning ? formatDate(tomorrow, locale, { weekday: 'long', day: 'numeric', month: 'long' }) : t('today.planning.pendingHint')}
          onPress={() => router.navigate('/plan')}
        />
      </Card>

      <BodyHero data={data} streak={streak.current} />

      <WaterCard />

      {/* Kitchen summary */}
      <DashboardCard icon="restaurant-outline" title={t('tabs.kitchen')} onPress={() => router.navigate('/kitchen')} testID="today-kitchen">
        {kitchen.mealsLogged ? (
          <>
            <View style={styles.kcalRow}>
              <AppText variant="display" style={styles.tabular}>
                {n.estimated ? n.kcal : '–'}
              </AppText>
              <AppText variant="bodyStrong" color="secondary">
                kcal
              </AppText>
            </View>
            {n.estimated ? (
              <View style={styles.macros}>
                <Macro label={t('food.protein')} value={n.protein} />
                <Macro label={t('food.carbs')} value={n.carbs} />
                <Macro label={t('food.fat')} value={n.fat} />
              </View>
            ) : null}
            <AppText variant="caption" color="secondary">
              {t('today.food.doneHint', { count: kitchen.mealsLogged })}
            </AppText>
          </>
        ) : (
          <AppText variant="body" color="secondary">
            {t('today.kitchenCard.empty')}
          </AppText>
        )}
        {kitchen.mealsPlanned ? (
          <View style={styles.note}>
            <Icon name={kitchen.openMeals.length ? 'time-outline' : 'checkmark-circle'} size={16} color={colors.primaryDeep} />
            <AppText variant="caption" style={styles.flex} numberOfLines={2}>
              {kitchen.openMeals.length ? t('today.kitchenCard.open', { meals: openMeals }) : t('today.kitchenCard.allLogged')}
            </AppText>
          </View>
        ) : null}
      </DashboardCard>

      {/* Gym summary */}
      <DashboardCard icon="barbell-outline" title={t('tabs.gym')} onPress={() => router.navigate('/gym')} testID="today-gym">
        <AppText variant="bodyStrong">{gym.sessions ? t('today.gymCard.trained') : gym.rest ? t('today.gymCard.rest') : t('today.gymCard.notYet')}</AppText>
        {gym.sessions ? (
          <AppText variant="caption" color="secondary">
            {[gym.types.map((ty) => activityLabel(t, ty)).join(', '), t('common.min', { count: gym.minutes })].join(' · ')}
          </AppText>
        ) : gym.planned && !gym.rest ? (
          <AppText variant="caption" color="secondary">
            {t('workout.planned', { summary: activitySummary(t, gym.planned) })}
          </AppText>
        ) : null}
      </DashboardCard>

      {/* Streak: the one dark premium card */}
      <Card variant="inverse" style={styles.streak}>
        <View style={styles.flame}>
          <Icon name="flame-outline" size={26} color={colors.primary} />
        </View>
        <View style={styles.flex}>
          <AppText variant="heading" color={colors.white}>
            {streak.current > 0 ? t('today.streak', { count: streak.current }) : t('today.streakZero')}
          </AppText>
          <AppText variant="caption" color={colors.onDarkMuted}>
            {t('today.longest', { count: streak.longest })}
          </AppText>
        </View>
      </Card>

      <View style={styles.section}>
        <AppText variant="heading">{t('today.calendar')}</AppText>
        <StreakCalendar data={data} today={today} />
      </View>

      <DashboardCard icon="trending-down-outline" title={t('today.journey.title')} onPress={() => router.push('/journey')}>
        <AppText variant="caption" color="secondary">
          {t('today.journey.body')}
        </AppText>
      </DashboardCard>
    </Screen>
  );
}

function Macro({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.macro}>
      <AppText variant="bodyStrong" style={styles.tabular}>
        {Math.round(value)} g
      </AppText>
      <AppText variant="caption" color="secondary" numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  greeting: { gap: 6 },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 4,
  },
  statusDone: { backgroundColor: colors.primaryLight },
  prime: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  flex: { flex: 1, gap: 2 },
  metrics: { flexDirection: 'row', gap: spacing.sm },
  mission: { gap: spacing.sm },
  missionHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.xxs },
  kcalRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  tabular: { fontVariant: ['tabular-nums'] },
  macros: { flexDirection: 'row', gap: spacing.sm },
  macro: { flex: 1, backgroundColor: colors.primarySoft, borderRadius: radii.md, paddingVertical: 10, paddingHorizontal: 12 },
  note: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  streak: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flame: { width: 48, height: 48, borderRadius: radii.pill, borderWidth: 1.5, borderColor: '#2A2A36', alignItems: 'center', justifyContent: 'center' },
  section: { gap: spacing.sm },
});
