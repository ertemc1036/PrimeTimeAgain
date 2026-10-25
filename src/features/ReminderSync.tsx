import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { syncReminders } from '@/services/notifications';
import { useAppState } from '@/state/AppStateProvider';

/** Reschedules local reminders whenever data or settings change, so finished tasks stop reminding. */
export function ReminderSync() {
  const { data, today } = useAppState();
  const { t } = useTranslation();
  useEffect(() => {
    const id = setTimeout(() => {
      syncReminders(data, today, (kind) => ({ title: t(`notifications.content.${kind}.title`), body: t(`notifications.content.${kind}.body`) })).catch(() => undefined);
    }, 800);
    return () => clearTimeout(id);
  }, [data, today, t]);
  return null;
}
