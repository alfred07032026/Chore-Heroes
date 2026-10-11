import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { MathGate } from '@/components/MathGate';
import { PinEntry } from '@/components/PinEntry';
import { Screen } from '@/components/Screen';
import { TopBar } from '@/components/TopBar';
import { Txt } from '@/components/Txt';
import { isWeakPin } from '@/domain/security';
import { checkPin, pinLockRemaining, setPin } from '@/services/settings';
import { mutate, requireDb, useAppStore } from '@/state/appStore';
import { colors, space } from '@/theme/tokens';

type Mode = 'enter' | 'forgot' | 'newPin' | 'confirmPin';

export default function ParentUnlock() {
  const unlockParent = useAppStore((s) => s.unlockParent);
  const [mode, setMode] = useState<Mode>('enter');
  const [error, setError] = useState<string | null>(null);
  const [lockedMs, setLockedMs] = useState(0);
  const [newPin, setNewPin] = useState('');

  useEffect(() => {
    void pinLockRemaining(requireDb()).then(setLockedMs);
  }, []);
  useEffect(() => {
    if (lockedMs <= 0) return;
    const id = setTimeout(() => setLockedMs((ms) => Math.max(0, ms - 1000)), 1000);
    return () => clearTimeout(id);
  }, [lockedMs]);

  const enter = useCallback(
    async (pin: string) => {
      const result = await checkPin(requireDb(), pin);
      if (result.ok) {
        setError(null);
        unlockParent();
        router.replace('/parent');
        return;
      }
      setLockedMs(result.lockedForMs);
      setError(
        result.lockedForMs > 0
          ? 'Too many tries. Please wait a moment.'
          : `That PIN isn't right. ${result.attemptsLeft} ${result.attemptsLeft === 1 ? 'try' : 'tries'} left before a short pause.`,
      );
    },
    [unlockParent],
  );

  const close = () => (router.canGoBack() ? router.back() : router.replace('/kids'));

  return (
    <Screen
      header={<TopBar onBack={close} backLabel="Back to heroes" title="Grown-ups" />}
      maxWidth={640}
    >
      {mode === 'enter' ? (
        <View style={{ gap: space.lg, alignItems: 'center' }}>
          <PinEntry
            title="Enter your PIN"
            error={lockedMs > 0 ? `Locked for ${Math.ceil(lockedMs / 1000)} seconds.` : error}
            disabled={lockedMs > 0}
            onComplete={(p) => void enter(p)}
          />
          <Button label="Forgot PIN?" tone="ghost" onPress={() => setMode('forgot')} />
        </View>
      ) : null}
      {mode === 'forgot' ? (
        <Card>
          <MathGate
            rounds={3}
            title="Reset your PIN"
            onCancel={() => setMode('enter')}
            onPass={() => {
              setError(null);
              setMode('newPin');
            }}
          />
        </Card>
      ) : null}
      {mode === 'newPin' ? (
        <PinEntry
          title="Choose a new PIN"
          error={error}
          onComplete={(p) => {
            if (isWeakPin(p)) {
              setError('Too easy to guess. Try another.');
              return;
            }
            setError(null);
            setNewPin(p);
            setMode('confirmPin');
          }}
        />
      ) : null}
      {mode === 'confirmPin' ? (
        <View style={{ gap: space.md }}>
          <PinEntry
            title="Type the new PIN again"
            error={error}
            onComplete={async (p) => {
              if (p !== newPin) {
                setError("Didn't match. Choose a new PIN again.");
                setMode('newPin');
                return;
              }
              await mutate((db) => setPin(db, p));
              setLockedMs(0);
              unlockParent();
              router.replace('/parent');
            }}
          />
          <Txt variant="caption" center color={colors.inkSoft}>
            Your data is kept. Only the PIN changes.
          </Txt>
        </View>
      ) : null}
    </Screen>
  );
}
