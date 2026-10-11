import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const REMINDER_ID = 'daily-chore-reminder';

/**
 * Local-only daily reminder for the family ("Time for hero jobs!").
 * No push token is ever requested and nothing leaves the device.
 */
export async function scheduleDailyReminder(hour: number, minute: number): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const perm = await Notifications.getPermissionsAsync();
  let granted = perm.granted;
  if (!granted && perm.canAskAgain) {
    granted = (await Notifications.requestPermissionsAsync()).granted;
  }
  if (!granted) return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Daily reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  await cancelDailyReminder();
  await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_ID,
    content: { title: 'Chore Heroes', body: 'Time for hero jobs! ⭐' },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: 'reminders',
    },
  });
  return true;
}

export async function cancelDailyReminder(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelScheduledNotificationAsync(REMINDER_ID).catch(() => undefined);
}

export function configureNotificationHandler(): void {
  if (Platform.OS === 'web') return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}
