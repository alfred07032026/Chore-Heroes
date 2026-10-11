import { Redirect, router, Stack } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

import { isParentSessionValid, useAppStore } from '@/state/appStore';
import { colors } from '@/theme/tokens';

/** Everything under /parent requires an unlocked parent session (PIN), which auto-expires. */
export default function ParentLayout() {
  const unlockedAt = useAppStore((s) => s.parentUnlockedAt);
  const touch = useAppStore((s) => s.touchParent);
  const reduceMotion = useAppStore((s) => s.settings.reduceMotion);

  useEffect(() => {
    const id = setInterval(() => {
      const s = useAppStore.getState();
      if (s.parentUnlockedAt && !isParentSessionValid(s)) {
        s.lockParent();
        router.dismissTo('/kids');
      }
    }, 15_000);
    return () => clearInterval(id);
  }, []);

  if (!unlockedAt) return <Redirect href="/parent-unlock" />;

  return (
    <View
      style={{ flex: 1 }}
      onStartShouldSetResponderCapture={() => {
        touch();
        return false;
      }}
    >
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: reduceMotion ? 'none' : 'default',
        }}
      />
    </View>
  );
}
