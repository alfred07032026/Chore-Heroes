import { useState } from 'react';
import { View } from 'react-native';

import { PIN_LENGTH } from '@/domain/security';
import { colors, space } from '@/theme/tokens';

import { applyKey, Keypad, PinDots } from './Keypad';
import { Txt } from './Txt';

/** PIN pad that calls onComplete once 4 digits are entered, then clears itself. */
export function PinEntry({
  title,
  subtitle,
  error,
  onComplete,
  disabled,
}: {
  title: string;
  subtitle?: string;
  error?: string | null;
  onComplete: (pin: string) => void;
  disabled?: boolean;
}) {
  const [pin, setPin] = useState('');
  const onKey = (k: string) => {
    const next = applyKey(pin, k, PIN_LENGTH);
    if (next.length === PIN_LENGTH) {
      setPin('');
      onComplete(next);
    } else setPin(next);
  };
  return (
    <View style={{ alignItems: 'center', gap: space.md }}>
      <Txt variant="title" center accessibilityRole="header">
        {title}
      </Txt>
      {subtitle ? (
        <Txt variant="body" center color={colors.inkSoft} style={{ maxWidth: 420 }}>
          {subtitle}
        </Txt>
      ) : null}
      <PinDots length={PIN_LENGTH} filled={pin.length} error={!!error} />
      <View style={{ minHeight: 24 }}>
        {error ? (
          <Txt variant="body" color={colors.danger} center accessibilityLiveRegion="assertive">
            {error}
          </Txt>
        ) : null}
      </View>
      <Keypad onKey={onKey} disabled={disabled} />
    </View>
  );
}
