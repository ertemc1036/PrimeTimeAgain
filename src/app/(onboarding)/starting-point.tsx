import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useOnboardingDraft } from '@/components/onboarding/OnboardingDraft';
import { OnboardingStep } from '@/components/onboarding/OnboardingStep';
import { Question } from '@/components/onboarding/Question';
import { AppText, Chip } from '@/components/ui';
import { getGoalTemplate } from '@/domain/catalog';
import type { AreaId, StartingPoint } from '@/domain/types';
import { spacing } from '@/theme';

const ACTIVITY = ['low', 'some', 'regular', 'high'] as const;
const TRAINING = ['home', 'gym', 'outdoors', 'mixed'] as const;
const CONFIDENCE = ['work', 'social', 'dating', 'speaking', 'new_people', 'appearance'] as const;
const MONEY = ['skill', 'side_project', 'career', 'business', 'saving'] as const;
const SLEEP = ['poor', 'ok', 'good'] as const;
const PRIORITY = ['routine', 'free_time', 'health', 'order'] as const;

/** Screen 5: a few questions tailored to the chosen areas. All optional; no sensitive data. */
export default function StartingPointScreen() {
  const { t } = useTranslation();
  const { draft, update } = useOnboardingDraft();
  const sp = draft.profile.startingPoint;
  const set = (patch: Partial<StartingPoint>) => update({ profile: { ...draft.profile, startingPoint: { ...sp, ...patch } } });
  const toggleIn = (list: string[] | undefined, v: string) => (list?.includes(v) ? list.filter((x) => x !== v) : [...(list ?? []), v]);

  const areas = new Set<AreaId>([
    ...draft.goalIds.map((id) => getGoalTemplate(id)!.area),
    ...draft.customGoals.map((g) => g.area),
  ]);
  const next = () => router.push('/duration');

  return (
    <OnboardingStep step={4} title={t('onboarding.start.title')} subtitle={t('onboarding.start.subtitle')} onNext={next} onSkip={next}>
      <View style={styles.sections}>
        {areas.has('body') ? (
          <>
            <Question label={t('onboarding.start.activity')}>
              {ACTIVITY.map((o) => (
                <Chip key={o} mode="radio" label={t(`onboarding.start.activityOptions.${o}`)} selected={sp.activity === o} onPress={() => set({ activity: sp.activity === o ? undefined : o })} />
              ))}
            </Question>
            <Question label={t('onboarding.start.training')}>
              {TRAINING.map((o) => (
                <Chip key={o} mode="radio" label={t(`onboarding.start.trainingOptions.${o}`)} selected={sp.training === o} onPress={() => set({ training: sp.training === o ? undefined : o })} />
              ))}
            </Question>
          </>
        ) : null}
        {areas.has('mind') || areas.has('social') || areas.has('presence') ? (
          <Question label={t('onboarding.start.confidence')}>
            {CONFIDENCE.map((o) => (
              <Chip key={o} label={t(`onboarding.start.confidenceOptions.${o}`)} selected={!!sp.confidence?.includes(o)} onPress={() => set({ confidence: toggleIn(sp.confidence, o) })} />
            ))}
          </Question>
        ) : null}
        {areas.has('money') ? (
          <Question label={t('onboarding.start.money')}>
            {MONEY.map((o) => (
              <Chip key={o} label={t(`onboarding.start.moneyOptions.${o}`)} selected={!!sp.money?.includes(o)} onPress={() => set({ money: toggleIn(sp.money, o) })} />
            ))}
          </Question>
        ) : null}
        <Question label={t('onboarding.start.sleep')}>
          {SLEEP.map((o) => (
            <Chip key={o} mode="radio" label={t(`onboarding.start.sleepOptions.${o}`)} selected={sp.sleep === o} onPress={() => set({ sleep: sp.sleep === o ? undefined : o })} />
          ))}
        </Question>
        <Question label={t('onboarding.start.priority')}>
          {PRIORITY.map((o) => (
            <Chip key={o} mode="radio" label={t(`onboarding.start.priorityOptions.${o}`)} selected={sp.priority === o} onPress={() => set({ priority: sp.priority === o ? undefined : o })} />
          ))}
        </Question>
        <AppText variant="caption" color="secondary">
          {t('onboarding.start.privacy')}
        </AppText>
      </View>
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({ sections: { gap: spacing.xl } });
