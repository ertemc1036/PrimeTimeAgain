import { Platform } from 'react-native';

/**
 * Optional daily reminder: one local notification, scheduled on the device (no server, no push token).
 * Copy is gentle and never guilt-based. Not available on web.
 */
const ID = 'pta-daily-reminder';

export type ReminderResult = 'scheduled' | 'denied' | 'unsupported';

export const remindersSupported = Platform.OS === 'ios' || Platform.OS === 'android';

export async function scheduleDailyReminder(time: string, content: { title: string; body: string }): Promise<ReminderResult> {
  if (!remindersSupported) return 'unsupported';
  const Notifications = await import('expo-notifications');
  const current = await Notifications.getPermissionsAsync();
  const granted = current.granted || (await Notifications.requestPermissionsAsync()).granted;
  if (!granted) return 'denied';
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', { name: content.title, importance: Notifications.AndroidImportance.DEFAULT });
  }
  const [hour, minute] = time.split(':').map(Number);
  await Notifications.cancelScheduledNotificationAsync(ID).catch(() => undefined);
  await Notifications.scheduleNotificationAsync({
    identifier: ID,
    content: { title: content.title, body: content.body },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: 'reminders' },
  });
  return 'scheduled';
}

export async function cancelDailyReminder(): Promise<void> {
  if (!remindersSupported) return;
  const Notifications = await import('expo-notifications');
  await Notifications.cancelScheduledNotificationAsync(ID).catch(() => undefined);
}

export const REMINDER_TIMES = ['07:00', '12:30', '18:00', '20:00', '21:30'] as const;
