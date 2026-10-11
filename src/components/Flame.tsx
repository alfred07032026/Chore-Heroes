import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { colors } from '@/theme/tokens';

import { Txt } from './Txt';

/** Streak flame. A zero streak shows a small, friendly "pilot light" instead of an empty state. */
export function Flame({
  days,
  size = 72,
  showNumber = true,
}: {
  days: number;
  size?: number;
  showNumber?: boolean;
}) {
  const lit = days > 0;
  return (
    <View
      style={{ width: size, height: size * 1.15, alignItems: 'center', justifyContent: 'center' }}
      accessible
      accessibilityLabel={
        lit
          ? `Hero flame: ${days} ${days === 1 ? 'day' : 'days'} in a row`
          : 'Hero flame is ready to light'
      }
    >
      <Svg width={size} height={size * 1.15} viewBox="0 0 100 115">
        <Path
          d="M50 4 C 58 28 86 40 86 72 C 86 96 70 112 50 112 C 30 112 14 96 14 72 C 14 52 28 44 34 26 C 40 40 44 44 48 46 C 50 30 46 18 50 4 Z"
          fill={lit ? colors.flame : colors.locked}
        />
        <Path
          d="M50 52 C 56 66 70 72 70 88 C 70 100 61 108 50 108 C 39 108 30 100 30 88 C 30 76 40 72 44 62 C 46 68 48 70 50 70 C 51 64 49 58 50 52 Z"
          fill={lit ? colors.star : '#DDD8E8'}
        />
      </Svg>
      {showNumber ? (
        <View style={{ position: 'absolute', bottom: size * 0.12 }}>
          <Txt
            variant={size >= 100 ? 'title' : 'label'}
            color={colors.ink}
            maxFontSizeMultiplier={1.2}
          >
            {days}
          </Txt>
        </View>
      ) : null}
    </View>
  );
}
