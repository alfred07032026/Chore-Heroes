import { router } from 'expo-router';
import { useState } from 'react';

import { PinEntry } from '@/components/PinEntry';
import { Screen } from '@/components/Screen';
import { TopBar } from '@/components/TopBar';
import { isWeakPin } from '@/domain/security';
import { checkPin, setPin } from '@/services/settings';
import { mutate, requireDb, useAppStore } from '@/state/appStore';

type Step = 'current' | 'new' | 'confirm';

export default function ChangePin() {
  const [step, setStep] = useState<Step>('current');
  const [error, setError] = useState<string | null>(null);
  const [next, setNext] = useState('');

  return (
    <Screen header={<TopBar title="Change PIN" onBack={() => router.back()} />} maxWidth={560}>
      {step === 'current' ? (
        <PinEntry
          title="Current PIN"
          error={error}
          onComplete={async (p) => {
            const r = await checkPin(requireDb(), p);
            if (r.ok) {
              setError(null);
              setStep('new');
            } else
              setError(
                r.lockedForMs > 0 ? 'Too many tries. Please wait.' : "That PIN isn't right.",
              );
          }}
        />
      ) : null}
      {step === 'new' ? (
        <PinEntry
          title="New PIN"
          error={error}
          onComplete={(p) => {
            if (isWeakPin(p)) {
              setError('Too easy to guess. Try another.');
              return;
            }
            setError(null);
            setNext(p);
            setStep('confirm');
          }}
        />
      ) : null}
      {step === 'confirm' ? (
        <PinEntry
          title="Type the new PIN again"
          error={error}
          onComplete={async (p) => {
            if (p !== next) {
              setError("Didn't match. Try again.");
              setStep('new');
              return;
            }
            await mutate((db) => setPin(db, p));
            useAppStore.getState().showFlash('PIN changed');
            router.back();
          }}
        />
      ) : null}
    </Screen>
  );
}
