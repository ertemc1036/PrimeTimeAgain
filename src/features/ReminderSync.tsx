import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useTranslation } from 'react-i18next';

import { onReminderTapped, ROUTE_FOR_KIND, syncReminders } from '@/services/notifications';
import { useAppState } from '@/state/AppStateProvider';

const timeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
};

/**
 * Keeps local reminders in step with the data: rescheduled after every change (so finished tasks stop
 * reminding), when the app returns to the foreground, and when the time zone changes.
 */
export function ReminderSync() {
  const { data, today } = useAppState();
  const { t } = useTranslation();
  const [wake, setWake] = useState(() => `${timeZone()}:0`);

  useEffect(() => {
    let n = 0;
    const sub = AppState.addEventListener('change', (s) => s === 'active' && setWake(`${timeZone()}:${++n}`));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      syncReminders(data, today, (kind) => ({ title: t(`notifications.content.${kind}.title`), body: t(`notifications.content.${kind}.body`) })).catch(() => undefined);
    }, 800);
    return () => clearTimeout(id);
  }, [data, today, t, wake]);

  useEffect(() => onReminderTapped((kind) => router.navigate(ROUTE_FOR_KIND[kind])), []);
  return null;
}
