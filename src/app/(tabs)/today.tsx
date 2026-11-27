import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Icon, ProgressBar, Screen } from '@/components/ui';
import { dailyBriefing } from '@/domain/briefing';
import { weightProgress } from '@/domain/bodyStats';
import { canEditCheckIns, dayChecks, isNextDayPlanned, streakStats } from '@/domain/completion';
import { daysBetween } from '@/domain/dates';
import { gymDay, hasEntries, kitchenDay, trainingWeek, waterDay, weeklyWeightChange } from '@/domain/daySummary';
import { totals } from '@/domain/nutrition';
import { MEAL_TYPES, type ISODate } from '@/domain/types';
import { activityLabel, activitySummary, mealLabel } from '@/features/labels';
import { DailyMission } from '@/features/today/DailyMission';
import { DashboardCard } from '@/features/today/DashboardCard';
import { NutritionCard } from '@/features/today/NutritionCard';
import { PrimeBriefing } from '@/features/today/PrimeBriefing';
import { WeekStrip } from '@/features/today/WeekStrip';
import { formatWeight } from '@/features/units';
import { WaterCard } from '@/features/WaterCard';
import { formatDate } from '@/i18n/format';
import { useLocale } from '@/i18n/useLanguage';
import { useAppState } from '@/state/AppStateProvider';
import { colors, fonts, radii, spacing } from '@/theme';
import { currentHour } from '@/utils/id';

const liters = (ml: number) => (ml / 1000).toFixed(2).replace(/\.?0+$/, '');

/**
 * Today: the central dashboard. Pick a day in the week strip: past days show what was logged, today
 * shows the live day, future days show what is planned (never as done). Everything comes from saved
 * data; details live on the Kitchen, Gym, Journey and Body Journey screens.
 */
export default function Today() {
  const { t } = useTranslation();
  const locale = useLocale();
  const { data, today } = useAppState();
  const [date, setDate] = useState<ISODate>(today);
  // Follow the calendar day while the app stays open over midnight.
  const lastToday = useRef(today);
  useEffect(() => {
    if (lastToday.current !== today) {
      setDate(today);
      lastToday.current = today;
    }
  }, [today]);

  const ahead = daysBetween(today, date);
  const isToday = ahead === 0;
  const isFuture = ahead > 0;
  const profile = data.profile;
  const showWeight = profile?.showWeight !== false;

  // The day's status for the selected day (today or a past day) – one source: src/domain/completion.ts.
  const checks = dayChecks(data, date);
  const tomorrowPlanned = isNextDayPlanned(data, today);
  const kitchen = kitchenDay(data, date);
  const gym = gymDay(data, date);
  const water = waterDay(data, date);
  const plan = data.plans[date];
  const plannedNutrition = totals((plan?.meals ?? []).flatMap((m) => m.items));
  const logs = data.foodLogs.filter((f) => f.date === date);

  const hour = currentHour();
  const greetingKey = hour < 12 ? 'today.morning' : hour < 18 ? 'today.afternoon' : 'today.evening';
  const dayLabel = formatDate(date, locale, { weekday: 'long', day: 'numeric', month: 'long' });
  const initial = (profile?.name?.trim()[0] ?? '·').toUpperCase();

  // Meals of the day: eaten entries first, then planned meals not logged yet.
  const mealRows = MEAL_TYPES.flatMap((mt) => {
    const eaten = logs.filter((l) => l.mealType === mt).map((l) => ({ id: l.id, mt, title: l.title, eaten: true }));
    const open = kitchen.openMeals.filter((m) => m.mealType === mt).map((m) => ({ id: m.id, mt, title: m.title, eaten: false }));
    return [...eaten, ...open];
  });

  const week = trainingWeek(data, today);
  const streak = streakStats(data, today);
  const w = weightProgress(data);
  const weekChange = weeklyWeightChange(data);
  const units = profile?.units ?? 'metric';
  const signed = (kg: number) => (kg === 0 ? formatWeight(0, units) : `${kg < 0 ? '−' : '+'}${formatWeight(Math.abs(kg), units)}`);

  return (
    <Screen inTabs>
      {/* 1. Header */}
      <View style={styles.header}>
        <View style={styles.flex}>
          <AppText variant="label" color="secondary">
            {formatDate(today, locale, { weekday: 'long', day: 'numeric', month: 'long' })}
          </AppText>
          <AppText style={styles.greeting} accessibilityRole="header" numberOfLines={2}>
            {t(greetingKey, { name: profile?.name ?? '' })}
          </AppText>
        </View>
        <Pressable onPress={() => router.navigate('/me')} accessibilityRole="button" accessibilityLabel={t('tabs.profile')} hitSlop={8} style={styles.avatar}>
          <AppText variant="bodyStrong" color={colors.white}>
            {initial}
          </AppText>
        </Pressable>
      </View>

      {/* 2. Week strip */}
      <WeekStrip today={today} selected={date} onSelect={setDate} hasEntries={(d) => hasEntries(data, d)} />

      {!isToday ? (
        <View style={styles.dayBanner}>
          <Icon name={isFuture ? 'calendar-outline' : 'time-outline'} size={16} color={colors.text} />
          <AppText variant="label" style={styles.flex}>
            {isFuture ? t('today.viewing.future', { date: dayLabel }) : t('today.viewing.past', { date: dayLabel })}
          </AppText>
          <Pressable onPress={() => setDate(today)} accessibilityRole="button" hitSlop={8}>
            <AppText variant="label" color={colors.text}>
              {t('common.today')}
            </AppText>
          </Pressable>
        </View>
      ) : null}

      {/* 3. Prime daily briefing (today only) */}
      {isToday ? <PrimeBriefing parts={dailyBriefing({ hour, kitchen, gym, water, checks, tomorrowPlanned })} /> : null}

      {/* Daily mission: food + activity (planning tomorrow is optional and not part of it) */}
      {!isFuture ? <DailyMission checks={checks} isToday={isToday} onFood={() => router.navigate('/kitchen')} onActivity={() => router.navigate('/gym')} /> : null}

      {/* 4 + 5. Nutrition and macros: logged, or planned for future days */}
      {isFuture ? (
        <DashboardCard icon="restaurant-outline" title={t('today.nutrition.plannedTitle')} onPress={() => router.push({ pathname: '/plan', params: { date } })}>
          <AppText variant="bodyStrong">
            {plan?.meals.length ? t('kitchen.tomorrow.meals', { count: plan.meals.length }) : plan?.flexibleMeals ? t('kitchen.tomorrow.flexible') : t('kitchen.tomorrow.none')}
          </AppText>
          {plannedNutrition.estimated ? (
            <AppText variant="caption" color="secondary">
              {t('today.nutrition.plannedKcal', { kcal: plannedNutrition.kcal })}
            </AppText>
          ) : null}
        </DashboardCard>
      ) : (
        <NutritionCard
          totals={kitchen.nutrition}
          mealsLogged={kitchen.mealsLogged}
          targets={profile?.targets ?? null}
          action={
            canEditCheckIns(date, today)
              ? { label: isToday ? t('today.nutrition.add') : t('today.nutrition.addLate'), onPress: () => router.push({ pathname: '/food-entry', params: { date } }) }
              : undefined
          }
        />
      )}

      {/* 6. Water */}
      {isToday ? (
        <WaterCard />
      ) : !isFuture ? (
        <View style={styles.inlineRow}>
          <Icon name="water-outline" size={18} color={colors.text} />
          <AppText variant="bodyStrong" style={styles.flex}>
            {t('water.title')}
          </AppText>
          <AppText variant="bodyStrong">{t('water.progress', { total: liters(water.ml), goal: liters(water.goalMl) })}</AppText>
        </View>
      ) : null}

      {/* 7. Training */}
      <DashboardCard icon="barbell-outline" title={t('today.training.title')} onPress={() => router.navigate('/gym')} testID="today-gym">
        <AppText variant="bodyStrong">
          {isFuture
            ? gym.planned
              ? activitySummary(t, gym.planned)
              : t('today.training.nothingPlanned')
            : gym.sessions
              ? t('today.gymCard.trained')
              : gym.rest || gym.planned?.type === 'rest'
                ? t('today.gymCard.rest')
                : t('today.gymCard.notYet')}
        </AppText>
        {!isFuture && gym.sessions ? (
          <AppText variant="caption" color="secondary">
            {[gym.types.map((ty) => activityLabel(t, ty)).join(', '), t('common.min', { count: gym.minutes })].join(' · ')}
          </AppText>
        ) : !isFuture && gym.planned && gym.planned.type !== 'rest' && !gym.rest ? (
          <AppText variant="caption" color="secondary">
            {t('workout.planned', { summary: activitySummary(t, gym.planned) })}
          </AppText>
        ) : null}
        <View style={styles.cardAction}>
          <AppText variant="label" color={colors.text}>
            {t('today.training.toGym')}
          </AppText>
        </View>
      </DashboardCard>

      {/* 8. Meals of the day */}
      <DashboardCard
        icon="fast-food-outline"
        title={t('today.meals.title')}
        onPress={() => (isFuture ? router.push({ pathname: '/plan', params: { date } }) : router.navigate('/kitchen'))}
        testID="today-kitchen">
        {mealRows.length ? (
          mealRows.map((r) => (
            <View key={r.id} style={styles.mealRow}>
              <AppText variant="caption" color="secondary" style={styles.mealType} numberOfLines={1}>
                {mealLabel(t, r.mt, true)}
              </AppText>
              <AppText variant="body" style={styles.flex} numberOfLines={1}>
                {r.title}
              </AppText>
              <View style={[styles.pill, r.eaten ? styles.pillEaten : styles.pillPlanned]}>
                <AppText variant="caption">{r.eaten ? t('today.meals.eaten') : t('today.meals.planned')}</AppText>
              </View>
            </View>
          ))
        ) : (
          <AppText variant="body" color="secondary">
            {t('today.meals.none')}
          </AppText>
        )}
        <View style={styles.cardAction}>
          <AppText variant="label" color={colors.text}>
            {isFuture ? t('today.meals.toPlan') : t('today.meals.toKitchen')}
          </AppText>
        </View>
      </DashboardCard>

      {/* 9. Progress: start, current, goal (optional), training, streak, milestones */}
      <DashboardCard icon="trending-up-outline" title={t('today.progressCard.title')} onPress={() => router.push('/journey')} testID="today-progress">
        {showWeight && w.currentKg !== null ? (
          <View style={styles.weightBlock}>
            <View style={styles.weights}>
              <WeightPoint label={t('avatar.start')} value={w.startKg === null ? '—' : formatWeight(w.startKg, units)} />
              <WeightPoint label={t('avatar.current')} value={formatWeight(w.currentKg, units)} strong align="center" />
              <WeightPoint label={t('avatar.goal')} value={w.goalKg === null ? '—' : formatWeight(w.goalKg, units)} align="right" />
            </View>
            {w.progress !== null ? <ProgressBar progress={w.progress} height={6} /> : null}
            {weekChange !== null ? (
              <AppText variant="caption" color="secondary">
                {t('today.progressCard.weekChange', { value: signed(weekChange) })}
              </AppText>
            ) : null}
          </View>
        ) : null}
        <View style={styles.stats}>
          <Stat label={t('today.progressCard.training')} value={t('gym.week.sessions', { count: week.sessions })} sub={t('gym.week.title')} />
          <Stat label={t('today.progressCard.streak')} value={t('avatar.days', { count: streak.current })} sub={t('today.longest', { count: streak.longest })} />
          {data.achievements.length ? <Stat label={t('journey.milestones')} value={String(data.achievements.length)} /> : null}
        </View>
      </DashboardCard>

      {/* Optional: plan tomorrow. Never a task, never counted towards the day or the streak. */}
      {isToday ? (
        <Pressable onPress={() => router.push('/plan')} accessibilityRole="button" style={styles.planRow} testID="today-plan-optional">
          <Icon name="calendar-outline" size={18} color={colors.textSecondary} />
          <View style={styles.flex}>
            <AppText variant="bodyStrong">{t('today.planOptional.title')}</AppText>
            <AppText variant="caption" color="secondary">
              {tomorrowPlanned ? t('today.planOptional.done') : t('today.planOptional.hint')}
            </AppText>
          </View>
          <Icon name="chevron-forward" size={18} color={colors.textSecondary} />
        </Pressable>
      ) : null}
    </Screen>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}${sub ? `, ${sub}` : ''}`}>
      <AppText variant="body" color="secondary" style={styles.flex}>
        {label}
      </AppText>
      <View style={styles.statValue}>
        <AppText variant="bodyStrong">{value}</AppText>
        {sub ? (
          <AppText variant="caption" color="secondary">
            {sub}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

function WeightPoint({ label, value, strong, align = 'left' }: { label: string; value: string; strong?: boolean; align?: 'left' | 'center' | 'right' }) {
  return (
    <View style={[styles.weightPoint, { alignItems: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center' }]}>
      <AppText variant="caption" color="secondary">
        {label}
      </AppText>
      <AppText variant={strong ? 'subheading' : 'body'}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  greeting: { fontFamily: fonts.bold, fontSize: 26, lineHeight: 32, letterSpacing: -0.6, color: colors.text },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.black, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.md },
  dayBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.card, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: 10 },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.md },
  cardAction: { flexDirection: 'row', justifyContent: 'flex-end' },
  mealRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 32 },
  mealType: { width: 88 },
  pill: { borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 3 },
  pillEaten: { backgroundColor: colors.card },
  pillPlanned: { backgroundColor: colors.card },
  stats: { gap: 2 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  statValue: { alignItems: 'flex-end' },
  weightBlock: { gap: spacing.xs, marginBottom: spacing.xs },
  weights: { flexDirection: 'row', alignItems: 'flex-end' },
  weightPoint: { flex: 1, gap: 2 },
});
