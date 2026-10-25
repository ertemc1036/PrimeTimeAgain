import { useTranslation } from 'react-i18next';

import { AppText, Card, Screen, TimeField, ToggleRow } from '@/components/ui';
import { parseTime } from '@/domain/dates';
import { useSave } from '@/hooks/useSave';
import { useAppState } from '@/state/AppStateProvider';

export default function EatingWindowScreen() {
  const { t } = useTranslation();
  const { data } = useAppState();
  const save = useSave();
  const w = data.eatingWindow;
  const set = (patch: Partial<typeof w>) => void save({ type: 'updateEatingWindow', patch });
  return (
    <Screen back="back" title={t('eatingWindow.title')} subtitle={t('eatingWindow.subtitle')}>
      <Card>
        <AppText variant="caption">{t('eatingWindow.health')}</AppText>
      </Card>
      <Card variant="outline" padded={false}>
        <ToggleRow label={t('eatingWindow.enable')} value={w.enabled} onChange={(enabled) => set({ enabled })} />
        <ToggleRow label={t('eatingWindow.reminders')} value={w.reminders} onChange={(reminders) => set({ reminders })} disabled={!w.enabled} divider={false} />
      </Card>
      {w.enabled ? (
        <>
          <TimeField label={t('eatingWindow.start')} value={w.start} onChange={(start) => parseTime(start) !== null && set({ start })} />
          <TimeField label={t('eatingWindow.end')} value={w.end} onChange={(end) => parseTime(end) !== null && set({ end })} />
        </>
      ) : null}
      <AppText variant="body" color="secondary">
        {t('eatingWindow.behavior')}
      </AppText>
    </Screen>
  );
}
