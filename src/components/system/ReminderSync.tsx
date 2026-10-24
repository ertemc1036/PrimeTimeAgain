import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { cancelDailyReminder, scheduleDailyReminder } from '@/services/reminders';
import { useAppState } from '@/state/AppStateProvider';

/** Keeps the scheduled reminder in sync with the user's preference, time and language. */
export function ReminderSync() {
  const { t, i18n } = useTranslation();
  const { data, status } = useAppState();
  const { reminders, reminderTime } = data.preferences;

  useEffect(() => {
    if (status !== 'ready') return;
    if (!reminders) {
      void cancelDailyReminder().catch(() => undefined);
      return;
    }
    void scheduleDailyReminder(reminderTime, { title: t('reminder.title'), body: t('reminder.body') }).catch(() => undefined);
  }, [status, reminders, reminderTime, i18n.language, t]);

  return null;
}
