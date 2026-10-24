import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { DurationPicker } from '@/components/plan/DurationPicker';
import { TimePicker } from '@/components/plan/TimePicker';
import { AppText, Button, Screen, SectionHeader } from '@/components/ui';
import { MIN_DURATION } from '@/domain/program';
import { useAppState } from '@/state/AppStateProvider';
import { useProgramInfo } from '@/state/selectors';

/** Change duration and daily time without resetting the journey. */
export default function PlanScreen() {
  const { t } = useTranslation();
  const { dispatch } = useAppState();
  const info = useProgramInfo();
  const [duration, setDuration] = useState(info?.program.durationDays ?? 90);
  const [minutes, setMinutes] = useState(info?.program.dailyMinutes ?? 30);
  if (!info) return null;
  const minDuration = Math.max(MIN_DURATION, info.rawDay);

  const save = async () => {
    await dispatch({ type: 'updateProgram', patch: { durationDays: Math.max(duration, minDuration), dailyMinutes: minutes } }).catch(() => undefined);
    router.back();
  };

  return (
    <Screen back="back" title={t('plan.title')} subtitle={t('plan.subtitle')} footer={<Button label={t('common.save')} onPress={save} />}>
      <SectionHeader title={t('plan.duration')} />
      <DurationPicker value={duration} onChange={setDuration} min={minDuration} />
      <AppText variant="caption" color="secondary">
        {t('plan.minDuration')}
      </AppText>
      <SectionHeader title={t('plan.time')} />
      <TimePicker value={minutes} onChange={setMinutes} />
      <AppText variant="caption" color="secondary">
        {t('plan.note')}
      </AppText>
    </Screen>
  );
}
