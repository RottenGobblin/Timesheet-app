import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import type { FollowUp } from '../lib/followUps';

/**
 * Local notifications only (no push server in v1). Every call is safe to make on web or
 * when permission is refused: it just does nothing and returns null/false.
 */

const DOSE_CHANNEL = 'dose-follow-ups';
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
