import { useFonts } from 'expo-font';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, AppState, View } from 'react-native';
import { ReducedMotionConfig, ReduceMotion } from 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Mascot } from '@/components/Mascot';
import { Toast } from '@/components/Toast';
import { Txt } from '@/components/Txt';
import { migrate } from '@/db/migrations';
import { openExpoDb } from '@/db/expoDb';
import { msUntilNextLocalMidnight, toDateKey } from '@/domain/dates';
import { configureNotificationHandler } from '@/platform/notifications';
import { backfillAll } from '@/services/instances';
import { isSetupComplete, loadSettings } from '@/services/settings';
import { isParentSessionValid, useAppStore } from '@/state/appStore';
import { FONT_ASSETS } from '@/theme/fonts';
import { colors, space } from '@/theme/tokens';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

async function boot() {
  const db = await openExpoDb();
  await migrate(db);
  const [settings, setup] = await Promise.all([loadSettings(db), isSetupComplete(db)]);
  const now = new Date();
  await backfillAll(db, toDateKey(now), now);
  useAppStore.getState().init(db, settings, setup);
}

/** Keeps "today" correct across midnight, time-zone changes and app resume. */
function useDayRollover() {
  const setToday = useAppStore((s) => s.setToday);
  const today = useAppStore((s) => s.today);
  useEffect(() => {
    const id = setTimeout(
      () => setToday(toDateKey(new Date())),
      msUntilNextLocalMidnight(new Date()),
    );
    return () => clearTimeout(id);
  }, [today, setToday]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      const store = useAppStore.getState();
      if (state === 'active') {
        store.setToday(toDateKey(new Date()));
        if (store.parentUnlockedAt && !isParentSessionValid()) store.lockParent();
      } else if (state === 'background') {
        // Parent mode never survives leaving the app.
        store.lockParent();
      }
    });
    return () => sub.remove();
  }, []);
}

function useSystemReduceMotion() {
  const set = useAppStore((s) => s.setSystemReduceMotion);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(set, () => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', set);
    return () => sub.remove();
  }, [set]);
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(FONT_ASSETS);
  const ready = useAppStore((s) => s.ready);
  const appReduceMotion = useAppStore((s) => s.settings.reduceMotion);
  const [bootError, setBootError] = useState<Error | null>(null);

  useEffect(() => {
    configureNotificationHandler();
    boot().catch((e: unknown) => setBootError(e instanceof Error ? e : new Error(String(e))));
  }, []);
  useDayRollover();
  useSystemReduceMotion();

  const loaded = ready && (fontsLoaded || !!fontError);
  useEffect(() => {
    if (loaded || bootError) void SplashScreen.hideAsync().catch(() => undefined);
  }, [loaded, bootError]);

  if (bootError) throw bootError;
  if (!loaded) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  return (
    <SafeAreaProvider>
      <ReducedMotionConfig mode={appReduceMotion ? ReduceMotion.Always : ReduceMotion.System} />
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: appReduceMotion ? 'none' : 'default',
        }}
      />
      <GlobalToast />
    </SafeAreaProvider>
  );
}

function GlobalToast() {
  const flash = useAppStore((s) => s.flash);
  const clear = useAppStore((s) => s.clearFlash);
  return (
    <Toast
      key={flash?.id ?? 0}
      message={flash?.message ?? null}
      icon="check-circle"
      onHide={clear}
    />
  );
}

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg,
        alignItems: 'center',
        justifyContent: 'center',
        gap: space.md,
        padding: space.lg,
      }}
    >
      <Mascot size={140} mood="calm" animate={false} />
      <Txt variant="title" center>
        Oops! Sparky tripped over his cape.
      </Txt>
      <Txt variant="body" center color={colors.inkSoft} style={{ maxWidth: 480 }}>
        Something went wrong. Your stars and jobs are safe on this device. Please try again.
      </Txt>
      <Txt variant="caption" center color={colors.inkSoft}>
        {error.message}
      </Txt>
      <Button label="Try again" icon="refresh" onPress={retry} />
    </View>
  );
}
