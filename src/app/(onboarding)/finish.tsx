import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Card, ListRow, ToggleRow } from '@/components/ui';
import { defaultNotifications } from '@/domain/types';
import { useOnboarding } from '@/features/onboarding/draft';
import { OnboardingStep } from '@/features/onboarding/OnboardingStep';
import { useAppState } from '@/state/AppStateProvider';
import { nowISO } from '@/utils/id';

export default function FinishStep() {
  const { t } = useTranslation();
  const { draft, update } = useOnboarding();
  const { dispatch, today } = useAppState();
  const [busy, setBusy] = useState(false);

  const start = async () => {
    if (!draft.adultConfirmed || !draft.name) {
      router.replace('/profile');
      return;
    }
    setBusy(true);
    const now = nowISO();
    const res = await dispatch({
      type: 'completeOnboarding',
      profile: {
        name: draft.name,
        adultConfirmed: true,
        heightCm: draft.heightCm,
        units: draft.units,
        goals: draft.goals,
        startWeightKg: draft.weightKg,
        goalWeightKg: draft.goalWeightKg,
        activityPrefs: draft.activityPrefs,
        food: draft.food,
        planningTime: draft.planningTime,
        createdAt: now,
        onboardingCompletedAt: now,
      },
      journey: { programEnabled: draft.journeyProgram, startDate: draft.journeyProgram ? today : undefined, maintenance: false },
      notifications: { ...defaultNotifications(), enabled: draft.notificationsEnabled },
    });
    if (draft.weightKg && res.ok) {
      await dispatch({ type: 'upsertWeight', entry: { id: `w_${today}`, date: today, kg: draft.weightKg, createdAt: now, updatedAt: now } });
    }
    setBusy(false);
    // The protected route group switches automatically; go straight to Today.
    router.replace('/today');
  };

  return (
    <OnboardingStep step={7} title={t('onboarding.finish.title')} subtitle={t('onboarding.finish.subtitle')} continueLabel={t('onboarding.finish.cta')} onContinue={() => void start()} disabled={busy}>
      <Card variant="outline" padded={false}>
        <ListRow label={t('onboarding.finish.name')} value={draft.name} />
        <ListRow label={t('onboarding.finish.goals')} value={draft.goals.map((g) => t(`onboarding.goals.${g}`)).join(', ')} />
        <ListRow label={t('onboarding.finish.activity')} value={draft.activityPrefs.map((a) => t(`onboarding.activity.${a}`)).join(', ')} />
        <ListRow label={t('onboarding.finish.planning')} value={draft.planningTime} />
        <ListRow label={t('onboarding.finish.reminders')} value={draft.notificationsEnabled ? t('common.on') : t('common.off')} divider={false} />
      </Card>
      <Card variant="outline" padded={false}>
        <ToggleRow label={t('onboarding.finish.journey')} hint={t('onboarding.finish.journeyHint')} value={draft.journeyProgram} onChange={(v) => update({ journeyProgram: v })} divider={false} />
      </Card>
    </OnboardingStep>
  );
}
