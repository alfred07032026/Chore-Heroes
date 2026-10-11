import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

type Kind = 'tap' | 'success' | 'warning';

/** Light haptic feedback (follows the Sound setting so "quiet mode" is fully quiet). */
export function haptic(kind: Kind, enabled: boolean): void {
  if (!enabled || Platform.OS === 'web') return;
  const run = () => {
    switch (kind) {
      case 'tap':
        return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      case 'success':
        return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      case 'warning':
        return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  };
  run().catch(() => undefined);
}
