import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppText, Card, OptionCard, Screen, TimeField, ToggleRow } from '@/components/ui';
import { nowTime, parseTime } from '@/domain/dates';
import { planReminders } from '@/domain/reminders';
import type { DisciplineMode, NotificationPrefs } from '@/domain/types';
import { useSave } from '@/hooks/useSave';
import { getPermission, requestPermission, type PermissionState } from '@/services/notifications';
import { useAppState } from '@/state/AppStateProvider';

const MODES: DisciplineMode[] = ['light', 'smart', 'focused', 'hourly'];

export default function NotificationSettings() {
  const { t } = useTranslation();
  const { data, today } = useAppState();
  const save = useSave();
  const n = data.notifications;
  const [perm, setPerm] = useState<PermissionState>('undetermined');
  useEffect(() => {
    void getPermission().then(setPerm);
  }, []);

  const set = (patch: Partial<NotificationPrefs>) => void save({ type: 'updateNotifications', patch });
  const setTime = (k: keyof NotificationPrefs) => (v: string) => parseTime(v) !== null && set({ [k]: v });

  const toggle = async (enabled: boolean) => {
    if (enabled) {
      const p = await requestPermission();
      setPerm(p);
      if (p !== 'granted') return;
    }
    set({ enabled });
  };

  const count = planReminders(data, today, nowTime()).length;

  return (
    <Screen back="back" title={t('notifications.title')}>
      {perm === 'unsupported' ? (
        <Card>
          <AppText variant="body">{t('notifications.web')}</AppText>
        </Card>
      ) : perm === 'denied' ? (
        <Card>
          <AppText variant="body">{t('notifications.denied')}</AppText>
        </Card>
      ) : null}
      <Card variant="outline" padded={false}>
        <ToggleRow label={t('notifications.enabled')} hint={t('notifications.enabledHint')} value={n.enabled} onChange={(v) => void toggle(v)} disabled={perm === 'unsupported'} />
        <ToggleRow label={t('notifications.pause')} hint={t('notifications.pauseHint')} value={n.paused} onChange={(paused) => set({ paused })} disabled={!n.enabled} divider={false} />
      </Card>
      <AppText variant="heading">{t('notifications.discipline')}</AppText>
      {MODES.map((m) => (
        <OptionCard key={m} title={t(`notifications.modes.${m}.title`)} subtitle={t(`notifications.modes.${m}.body`)} selected={n.mode === m} onPress={() => set({ mode: m })} />
      ))}
      {n.mode !== 'light' ? <TimeField label={t('notifications.morning')} value={n.morningTime} onChange={setTime('morningTime')} /> : null}
      {n.mode === 'hourly' ? (
        <>
          <TimeField label={t('notifications.hourlyStart')} value={n.hourlyStart} onChange={setTime('hourlyStart')} />
          <TimeField label={t('notifications.hourlyEnd')} value={n.hourlyEnd} onChange={setTime('hourlyEnd')} />
        </>
      ) : null}
      <TimeField label={t('notifications.quietStart')} value={n.quietStart} onChange={setTime('quietStart')} />
      <TimeField label={t('notifications.quietEnd')} value={n.quietEnd} onChange={setTime('quietEnd')} />
      {n.enabled && !n.paused ? (
        <AppText variant="caption" color="secondary">
          {t('notifications.nextUp', { count })}
        </AppText>
      ) : null}
    </Screen>
  );
}
