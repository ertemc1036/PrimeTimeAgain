import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import { fromISODate, nowTime, parseTime } from '@/domain/dates';
import { planReminders, type ReminderKind } from '@/domain/reminders';
import type { AppData, ISODate } from '@/domain/types';

export type PermissionState = 'granted' | 'denied' | 'undetermined' | 'unsupported';

export const notificationsSupported = Platform.OS === 'ios' || Platform.OS === 'android';

if (notificationsSupported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
}

export async function getPermission(): Promise<PermissionState> {
  if (!notificationsSupported) return 'unsupported';
  try {
    const p = await Notifications.getPermissionsAsync();
    return p.granted ? 'granted' : p.canAskAgain ? 'undetermined' : 'denied';
  } catch {
    return 'unsupported';
  }
}

export async function requestPermission(): Promise<PermissionState> {
  if (!notificationsSupported) return 'unsupported';
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return 'granted';
    if (!current.canAskAgain) return 'denied';
    const p = await Notifications.requestPermissionsAsync();
    return p.granted ? 'granted' : 'denied';
  } catch {
    return 'unsupported';
  }
}

export type ReminderCopy = (kind: ReminderKind) => { title: string; body: string };

/**
 * Replace all scheduled reminders with the current plan for the next two days.
 * Completed tasks, quiet hours and past times are already filtered by `planReminders`.
 */
export async function syncReminders(data: AppData, today: ISODate, copy: ReminderCopy): Promise<number> {
  if (!notificationsSupported) return 0;
  await Notifications.cancelAllScheduledNotificationsAsync();
  const prefs = data.notifications;
  if (!data.profile || !prefs.enabled || prefs.paused) return 0;
  if ((await getPermission()) !== 'granted') return 0;
  const reminders = planReminders(data, today, nowTime());
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', { name: 'Reminders', importance: AndroidImportance.DEFAULT });
  }
  for (const r of reminders) {
    const minutes = parseTime(r.time);
    if (minutes === null) continue;
    const at = fromISODate(r.date);
    at.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    await Notifications.scheduleNotificationAsync({
      content: { ...copy(r.kind), data: { kind: r.kind, date: r.date } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: 'reminders' },
    });
  }
  return reminders.length;
}

/** Tab that answers a reminder (tapping a notification opens it). */
export const ROUTE_FOR_KIND: Record<ReminderKind, '/today' | '/plan' | '/food' | '/workout'> = {
  morning: '/today',
  activity: '/workout',
  meal: '/food',
  planning: '/plan',
  checkin: '/today',
  hourly: '/today',
  window: '/food',
};

export function onReminderTapped(fn: (kind: ReminderKind) => void): () => void {
  if (!notificationsSupported) return () => undefined;
  const sub = Notifications.addNotificationResponseReceivedListener((r) => {
    const kind = r.notification.request.content.data?.kind as ReminderKind | undefined;
    if (kind && kind in ROUTE_FOR_KIND) fn(kind);
  });
  return () => sub.remove();
}
