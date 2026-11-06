import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import type { FollowUp } from '../lib/followUps';
import type { PlannedReminder } from '../lib/reminderSchedule';

/**
 * Local notifications only (no push server in v1). Every call is safe to make on web or
 * when permission is refused: it just does nothing and returns null/false.
 */

const DOSE_CHANNEL = 'dose-follow-ups';
const REMINDER_CHANNEL = 'test-reminders';
const PLANNED_TYPES = ['test-reminder', 'overdue'];
const supported = Platform.OS === 'ios' || Platform.OS === 'android';

let configured = false;

/** Show reminders even when the app is open. Call once at startup. */
export function configureNotifications(): void {
  if (!supported || configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync(DOSE_CHANNEL, {
      name: 'Dose follow-ups',
      importance: AndroidImportance.HIGH,
    }).catch(() => undefined);
    Notifications.setNotificationChannelAsync(REMINDER_CHANNEL, {
      name: 'Test reminders',
      importance: AndroidImportance.DEFAULT,
    }).catch(() => undefined);
  }
}

/** True if notifications are already allowed (never prompts). */
export async function hasPermission(): Promise<boolean> {
  if (!supported) return false;
  try {
    return (await Notifications.getPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

/** Ask for permission if we haven't got it. Returns true if reminders can be shown. */
export async function ensurePermission(): Promise<boolean> {
  if (!supported) return false;
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const asked = await Notifications.requestPermissionsAsync();
    return asked.granted;
  } catch {
    return false;
  }
}

/** Schedule a dose follow-up. Returns the notification id, or null if it couldn't be scheduled. */
export async function scheduleFollowUp(followUp: FollowUp): Promise<string | null> {
  if (!supported || followUp.at.getTime() <= Date.now()) return null;
  if (!(await ensurePermission())) return null;
  try {
    return await Notifications.scheduleNotificationAsync({
      content: { title: followUp.title, body: followUp.body, data: { type: 'dose-follow-up', step: followUp.kind } },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: followUp.at,
        channelId: DOSE_CHANNEL,
      },
    });
  } catch {
    return null;
  }
}

export async function cancelReminder(id: string | undefined): Promise<void> {
  if (!supported || !id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // Already fired or gone: nothing to do.
  }
}

/**
 * Replace all scheduled test and overdue reminders with this list. Dose follow-ups are left
 * alone. Only prompts for permission when ask is true.
 */
export async function syncPlannedReminders(planned: PlannedReminder[], ask: boolean): Promise<number> {
  if (!supported) return 0;
  const allowed = ask ? await ensurePermission() : await hasPermission();
  if (!allowed) return 0;
  try {
    const existing = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      existing
        .filter((n) => PLANNED_TYPES.includes(String(n.content.data?.type)))
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
    );
    const now = Date.now();
    let count = 0;
    for (const r of planned) {
      if (r.at.getTime() <= now) continue;
      await Notifications.scheduleNotificationAsync({
        content: { title: r.title, body: r.body, data: { type: r.kind } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.at, channelId: REMINDER_CHANNEL },
      });
      count++;
    }
    return count;
  } catch {
    return 0;
  }
}
