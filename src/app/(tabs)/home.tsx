import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { greetingFor } from '@/components/home/greeting';
import { PrimeScoreCard } from '@/components/home/PrimeScoreCard';
import { JourneySummaryCard } from '@/components/journey/JourneySummaryCard';
import { GoalCheckRow } from '@/components/tasks/GoalCheckRow';
import { AppText, Banner, Button, Card, EmptyState, Icon, PressableScale, Screen, SectionHeader } from '@/components/ui';
import { formatDate } from '@/i18n/format';
import { useLanguage } from '@/i18n/useLanguage';
import { localCoachService, type CoachMessage } from '@/services/coach/CoachService';
import { useAppState } from '@/state/AppStateProvider';
import { useDashboard } from '@/state/selectors';
import { colors, palette, radii, shadows, spacing } from '@/theme';

const PREVIEW_COUNT = 3;

export default function HomeScreen() {
  const { t } = useTranslation();
  const { code } = useLanguage();
  const { data, today, toggleGoal, saveError, dismissSaveError } = useAppState();
  const { goals, doneToday, completedToday, score, day } = useDashboard();
  const [coach, setCoach] = useState<CoachMessage | null>(null);

  useEffect(() => {
    let active = true;
    localCoachService
      .getDailyMessage({ date: today, language: code })
      .then((m) => active && setCoach(m))
      .catch(() => active && setCoach(null));
    return () => {
      active = false;
    };
  }, [today, code]);

  const name = data.profile?.name;
  const greeting = t(`home.greeting.${greetingFor()}`);
  // Show open goals first so the next step is always visible.
  const preview = [...goals].sort((a, b) => Number(doneToday.has(a.id)) - Number(doneToday.has(b.id))).slice(0, PREVIEW_COUNT);
  const initials = (name || '·').trim().charAt(0).toLocaleUpperCase(code);

  const section = (i: number) => FadeInDown.delay(80 * i).duration(450);

  return (
    <Screen inTabs>
      <Animated.View entering={section(0)} style={styles.header}>
        <View style={styles.headerText}>
          <AppText variant="label" color={colors.textMuted}>
            {formatDate(today, code, { weekday: 'long', day: 'numeric', month: 'long' })}
          </AppText>
          <AppText variant="title">{name ? t('home.greeting.withName', { greeting, name }) : greeting}</AppText>
        </View>
        <PressableScale
          onPress={() => router.push('/profile')}
          accessibilityRole="button"
          accessibilityLabel={t('tabs.profile')}
          style={[styles.avatar, shadows.soft]}>
          <AppText variant="subheading" color={colors.primaryText}>
            {initials}
          </AppText>
        </PressableScale>
      </Animated.View>

      {saveError ? <Banner message={t('states.saveError')} onDismiss={dismissSaveError} /> : null}

      <Animated.View entering={section(1)}>
        <PrimeScoreCard score={score} />
      </Animated.View>

      <Animated.View entering={section(2)} style={styles.group}>
        <SectionHeader title={t('home.todayTitle')} action={t('common.seeAll')} onAction={() => router.push('/today')} />
        {goals.length === 0 ? (
          <Card>
            <EmptyState
              icon="target"
              title={t('today.empty.title')}
              body={t('today.empty.body')}
              action={t('today.empty.action')}
              onAction={() => router.push('/goals')}
            />
          </Card>
        ) : (
          <>
            <AppText variant="caption" color={colors.textSecondary}>
              {completedToday === goals.length
                ? t('home.allDone')
                : t('home.todayProgress', { completed: completedToday, total: goals.length })}
            </AppText>
            {preview.map((goal) => (
              <GoalCheckRow key={goal.id} goal={goal} done={doneToday.has(goal.id)} onToggle={() => toggleGoal(goal.id)} />
            ))}
          </>
        )}
      </Animated.View>

      <Animated.View entering={section(3)}>
        <JourneySummaryCard day={day} />
      </Animated.View>

      {coach ? (
        <Animated.View entering={section(4)}>
          <Card tint={palette.blueSoft} elevated={false} style={styles.coach}>
            <View style={styles.coachHead}>
              <Icon name="sun" size={18} color={palette.blueDeep} />
              <AppText variant="overline" color={palette.blueDeep}>
                {t('home.coachTitle')}
              </AppText>
            </View>
            <AppText variant="body">{coach.kind === 'tip' ? t(coach.key) : coach.text}</AppText>
          </Card>
        </Animated.View>
      ) : null}

      <Animated.View entering={section(5)}>
        <Card tint={palette.peachSoft} elevated={false} style={styles.reflect}>
          <AppText variant="heading">{t('home.reflectTitle')}</AppText>
          <AppText variant="caption" color={colors.textSecondary}>
            {t('home.reflectBody')}
          </AppText>
          <View style={styles.reflectAction}>
            <Button
              label={t('home.reflectAction')}
              variant="secondary"
              icon="edit-3"
              fullWidth={false}
              onPress={() => router.push('/reflection')}
            />
          </View>
        </Card>
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.xs },
  headerText: { flex: 1, gap: spacing.xxs },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  group: { gap: spacing.sm },
  coach: { gap: spacing.xs },
  coachHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  reflect: { gap: spacing.xs },
  reflectAction: { marginTop: spacing.xs },
});
