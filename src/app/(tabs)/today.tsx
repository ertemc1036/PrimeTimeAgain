import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { GoalCheckRow } from '@/components/tasks/GoalCheckRow';
import { AppText, Banner, Card, EmptyState, IconButton, PillarBadge, ProgressRing, Screen } from '@/components/ui';
import { PILLARS } from '@/domain/types';
import { formatDate } from '@/i18n/format';
import { useLanguage } from '@/i18n/useLanguage';
import { useAppState } from '@/state/AppStateProvider';
import { useDashboard } from '@/state/selectors';
import { colors, spacing } from '@/theme';

export default function TodayScreen() {
  const { t } = useTranslation();
  const { code } = useLanguage();
  const { today, toggleGoal, saveError, dismissSaveError } = useAppState();
  const { goals, doneToday, completedToday } = useDashboard();
  const total = goals.length;

  return (
    <Screen
      inTabs
      title={t('today.title')}
      subtitle={formatDate(today, code, { weekday: 'long', day: 'numeric', month: 'long' })}
      headerRight={<IconButton icon="sliders" label={t('today.editGoals')} onPress={() => router.push('/goals')} />}>
      {saveError ? <Banner message={t('states.saveError')} onDismiss={dismissSaveError} /> : null}

      {total === 0 ? (
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
          <Animated.View entering={FadeInDown.duration(400)}>
            <Card style={styles.summary}>
              <ProgressRing progress={completedToday / total} size={76} stroke={8}>
                <AppText variant="subheading">{`${completedToday}/${total}`}</AppText>
              </ProgressRing>
              <View style={styles.summaryText}>
                <AppText variant="subheading">
                  {completedToday === total ? t('home.allDone') : t('today.progress', { completed: completedToday, total })}
                </AppText>
                <AppText variant="caption" color={colors.textSecondary}>
                  {t('today.gentleNote')}
                </AppText>
              </View>
            </Card>
          </Animated.View>

          {PILLARS.map((pillar, i) => {
            const items = goals.filter((g) => g.pillar === pillar);
            if (items.length === 0) return null;
            return (
              <Animated.View key={pillar} entering={FadeInDown.delay(100 + i * 80).duration(400)} style={styles.group}>
                <PillarBadge pillar={pillar} />
                {items.map((goal) => (
                  <GoalCheckRow key={goal.id} goal={goal} done={doneToday.has(goal.id)} onToggle={() => toggleGoal(goal.id)} />
                ))}
              </Animated.View>
            );
          })}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  summaryText: { flex: 1, gap: spacing.xxs },
  group: { gap: spacing.sm },
});
