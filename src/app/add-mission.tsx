import { router } from 'expo-router';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Screen, SelectCard } from '@/components/ui';
import { getActionTemplate } from '@/domain/catalog';
import { missionFromAction } from '@/domain/missions';
import { actionTitle, goalTitle } from '@/i18n/content';
import { useAppState } from '@/state/AppStateProvider';
import { activeGoals } from '@/state/selectors';
import { spacing } from '@/theme';

/** Add an extra mission for today from any active goal action. */
export default function AddMissionScreen() {
  const { t } = useTranslation();
  const { data, today, dispatch } = useAppState();
  const planned = new Set((data.days[today]?.missions ?? []).map((m) => m.actionTemplateId ?? m.actionId));

  return (
    <Screen back="close" title={t('missions.addTitle')} subtitle={t('missions.addSubtitle')}>
      {activeGoals(data.goals).map((goal) => {
        const actions = goal.actions.filter((a) => a.active && !planned.has(a.templateId ?? a.id));
        if (actions.length === 0) return null;
        return (
          <View key={goal.id} style={{ gap: spacing.xs }}>
            <AppText variant="overline" color="secondary">
              {goalTitle(t, goal)}
            </AppText>
            {actions.map((a) => (
              <SelectCard
                key={a.id}
                glyph={getActionTemplate(a.templateId)?.icon ?? 'add'}
                title={actionTitle(t, a, goal)}
                meta={t('common.minutes', { count: a.minutes })}
                selected={false}
                onPress={() => {
                  void dispatch({ type: 'addMission', date: today, mission: missionFromAction(today, goal, a, (data.days[today]?.missions.length ?? 0) + 1) }).catch(() => undefined);
                  router.back();
                }}
              />
            ))}
          </View>
        );
      })}
    </Screen>
  );
}
