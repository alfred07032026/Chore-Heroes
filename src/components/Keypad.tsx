import { View } from 'react-native';

import { colors, radius, space } from '@/theme/tokens';

import { Icon } from './Icon';
import { Pressy } from './Pressy';
import { Txt } from './Txt';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back'] as const;

/** Big numeric keypad used for the PIN and the math gate. */
export function Keypad({
  onKey,
  disabled,
  keySize = 76,
}: {
  onKey: (k: string) => void;
  disabled?: boolean;
  keySize?: number;
}) {
  return (
    <View
      style={{
        width: keySize * 3 + space.md * 2,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: space.md,
      }}
    >
      {KEYS.map((k) => (
        <Pressy
          key={k}
          testID={`key-${k}`}
          disabled={disabled}
          onPress={() => onKey(k)}
          accessibilityLabel={k === 'back' ? 'Delete' : k === 'clear' ? 'Clear' : k}
          style={{
            width: keySize,
            height: keySize,
            borderRadius: radius.round,
            backgroundColor: k === 'back' || k === 'clear' ? colors.surfaceAlt : colors.surface,
            borderWidth: 2,
            borderColor: colors.control,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: disabled ? 0.4 : 1,
          }}
        >
          {k === 'back' ? (
            <Icon name="backspace-outline" size={28} color={colors.ink} />
          ) : k === 'clear' ? (
            <Icon name="close" size={28} color={colors.ink} />
          ) : (
            <Txt variant="title" maxFontSizeMultiplier={1.2}>
              {k}
            </Txt>
          )}
        </Pressy>
      ))}
    </View>
  );
}

/** Applies a keypad key to a numeric string. */
export function applyKey(current: string, key: string, maxLength: number): string {
  if (key === 'back') return current.slice(0, -1);
  if (key === 'clear') return '';
  if (current.length >= maxLength) return current;
  return current + key;
}

export function PinDots({
  length,
  filled,
  error,
}: {
  length: number;
  filled: number;
  error?: boolean;
}) {
  return (
    <View
      style={{ flexDirection: 'row', gap: space.md, justifyContent: 'center' }}
      accessible
      accessibilityLabel={`${filled} of ${length} digits entered`}
    >
      {Array.from({ length }, (_, i) => (
        <View
          key={i}
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            borderWidth: 3,
            borderColor: error ? colors.danger : colors.hero,
            backgroundColor: i < filled ? (error ? colors.danger : colors.hero) : 'transparent',
          }}
        />
      ))}
    </View>
  );
}
