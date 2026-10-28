import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Card, Chip, Icon, IconButton, ProgressRing, Screen, useToast } from '@/components/ui';
import { dayChecks, streakStats } from '@/domain/completion';
import { addDays } from '@/domain/dates';
import { activitySummary } from '@/features/labels';
import { BodyHero } from '@/features/avatar/BodyHero';
import { MissionCard } from '@/features/MissionCard';
import { StreakCalendar } from '@/features/StreakCalendar';
import { formatDate } from '@/i18n/format';
import { useLocale } from '@/i18n/useLanguage';
import { useAppState } from '@/state/AppStateProvider';
import { colors, radii, spacing } from '@/theme';
import { currentHour } from '@/utils/id';

export default function Today() {
  const { t } = useTranslation();
  const locale = useLocale();
  const { data, today } = useAppState();
  const toast = useToast();
  const checks = dayChecks(data, today);
  const streak = streakStats(data, today);
  const plan = data.plans[today];
  const tomorrow = addDays(today, 1);
  const foodCount = data.foodLogs.filter((f) => f.date === today).length;
  const rest = !!data.recoveryLogs[today];

  const hour = currentHour();
  const greetingKey = hour < 12 ? 'today.morning' : hour < 18 ? 'today.afternoon' : 'today.evening';

  // Celebrate once when the third task completes during this session.
  const prevDone = useRef(checks.done);
  useEffect(() => {
    if (checks.complete && prevDone.current < 3) toast(t("today.complete.title"), "trophy-outline");
    prevDone.current = checks.done;
  }, [checks.complete, checks.done, toast, t]);

  return (
    <Screen
      inTabs
      headerRight={<IconButton icon="person-circle-outline" label={t('today.profile')} onPress={() => router.push('/settings')} variant="plain" />}>
      <View style={styles.greeting}>
        <AppText variant="label" color="secondary">
          {formatDate(today, locale, { weekday: 'long', day: 'numeric', month: 'long' })}
        </AppText>
        <AppText variant="title" accessibilityRole="header">
          {t(greetingKey, { name: data.profile?.name ?? '' })}
        </AppText>
        <AppText variant="body" color="secondary">
          {t('today.subtitle')}
        </AppText>
      </View>

      <BodyHero data={data} streak={streak.current} />

      <Card variant="inverse" style={styles.streak}>
        <View style={styles.flame}>
          <Icon name="flame-outline" size={30} color={colors.white} />
        </View>
        <View style={styles.flex}>
          <AppText variant="heading" color={colors.white}>
            {streak.current > 0 ? t('today.streak', { count: streak.current }) : t('today.streakZero')}
          </AppText>
          <AppText variant="caption" color="#BDBDBD">
            {t('today.longest', { count: streak.longest })}
          </AppText>
        </View>
      </Card>

      <Card style={styles.mission}>
        <ProgressRing progress={checks.done / 3} size={84} stroke={8}>
          <AppText variant="heading">{checks.done}/3</AppText>
        </ProgressRing>
        <View style={styles.flex}>
          <AppText variant="subheading">{t('today.mission')}</AppText>
          <AppText variant="body" color="secondary">
            {t('today.progress', { done: checks.done })}
          </AppText>
          {checks.complete ? <AppText variant="bodyStrong">{t('today.complete.body')}</AppText> : null}
        </View>
      </Card>

      <View style={styles.cards}>
        <MissionCard
          icon="restaurant-outline"
          done={checks.food}
          title={checks.food ? t('today.food.done') : t('today.food.pending')}
          hint={checks.food ? t('today.food.doneHint', { count: foodCount }) : t('today.food.pendingHint')}
          onPress={() => router.navigate('/food')}
        />
        <MissionCard
          icon={rest ? 'moon-outline' : 'barbell-outline'}
          done={checks.activity}
          title={checks.activity ? (rest ? t('today.activity.rest') : t('today.activity.done')) : t('today.activity.pending')}
          hint={checks.activity ? undefined : plan?.activity ? activitySummary(t, plan.activity) : t('today.activity.pendingHint')}
          onPress={() => router.navigate('/workout')}
        />
        <MissionCard
          icon="calendar-outline"
          done={checks.planning}
          title={checks.planning ? t('today.planning.done') : t('today.planning.pending')}
          hint={checks.planning ? formatDate(tomorrow, locale, { weekday: 'long', day: 'numeric', month: 'long' }) : t('today.planning.pendingHint')}
          onPress={() => router.navigate('/plan')}
        />
      </View>

      <View style={styles.section}>
        <AppText variant="heading">{t('today.calendar')}</AppText>
        <StreakCalendar data={data} today={today} />
      </View>

      <View style={styles.quick}>
        <Chip label={t('today.quick.food')} icon="add" selected={false} onPress={() => router.push('/food-entry')} />
        <Chip label={t('today.quick.activity')} icon="add" selected={false} onPress={() => router.navigate('/workout')} />
        <Chip label={t('today.quick.plan')} icon="calendar-outline" selected={false} onPress={() => router.navigate('/plan')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  greeting: { gap: 4 },
  flex: { flex: 1, gap: 2 },
  streak: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flame: { width: 52, height: 52, borderRadius: radii.pill, borderWidth: 1.5, borderColor: '#3A3A3A', alignItems: 'center', justifyContent: 'center' },
  mission: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  cards: { gap: spacing.sm },
  section: { gap: spacing.sm },
  quick: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
