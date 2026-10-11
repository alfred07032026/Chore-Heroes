import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, G, Path, Polygon } from 'react-native-svg';

import { useReduceMotion } from '@/state/appStore';
import { colors, radius, shadow, space } from '@/theme/tokens';

import { IconButton } from './Button';
import { Txt } from './Txt';
import { speak } from '@/platform/speech';

export type MascotMood = 'happy' | 'cheer' | 'calm';

function starPoints(cx: number, cy: number, outer: number, inner: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
}

const BODY = starPoints(50, 54, 44, 22);

/** "Sparky", the Chore Heroes mascot: a smiling star with a hero cape and mask. */
export function Mascot({
  size = 120,
  mood = 'happy',
  animate = true,
}: {
  size?: number;
  mood?: MascotMood;
  animate?: boolean;
}) {
  const reduce = useReduceMotion();
  const y = useSharedValue(0);
  useEffect(() => {
    if (reduce || !animate) {
      cancelAnimation(y);
      y.value = 0;
      return;
    }
    y.value = withRepeat(
      withSequence(
        withTiming(-size * 0.04, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      ),
      3, // a short greeting bob, then still: no endless decorative motion
    );
    return () => cancelAnimation(y);
  }, [reduce, animate, size, y]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

  return (
    <Animated.View
      style={[{ width: size, height: size }, style]}
      // Decorative: the message next to Sparky carries the meaning, so screen readers skip him.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width={size} height={size} viewBox="0 0 100 100">
        {/* cape */}
        <Path d="M30 40 Q 12 78 18 97 Q 50 88 82 97 Q 88 78 70 40 Z" fill={colors.hero} />
        <Path
          d="M30 40 Q 22 70 26 92 Q 50 84 74 92 Q 78 70 70 40 Z"
          fill={colors.heroDark}
          opacity={0.35}
        />
        {/* body */}
        <Polygon
          points={BODY}
          fill={colors.star}
          stroke="#E0A100"
          strokeWidth={2.5}
          strokeLinejoin="round"
        />
        {/* mask */}
        <Path d="M30 48 Q 50 40 70 48 L 70 56 Q 50 50 30 56 Z" fill={colors.hero} />
        <G>
          <Ellipse cx={41} cy={51} rx={5} ry={mood === 'calm' ? 3.5 : 5} fill={colors.white} />
          <Ellipse cx={59} cy={51} rx={5} ry={mood === 'calm' ? 3.5 : 5} fill={colors.white} />
          <Circle cx={42} cy={51.5} r={2.6} fill={colors.ink} />
          <Circle cx={60} cy={51.5} r={2.6} fill={colors.ink} />
          <Circle cx={43} cy={50.3} r={0.9} fill={colors.white} />
          <Circle cx={61} cy={50.3} r={0.9} fill={colors.white} />
        </G>
        {/* cheeks */}
        <Circle cx={35} cy={62} r={3.5} fill="#FF8FA3" opacity={0.7} />
        <Circle cx={65} cy={62} r={3.5} fill="#FF8FA3" opacity={0.7} />
        {/* mouth */}
        {mood === 'cheer' ? (
          <Path
            d="M42 61 Q 50 74 58 61 Z"
            fill="#7A1F3D"
            stroke={colors.ink}
            strokeWidth={1.5}
            strokeLinejoin="round"
          />
        ) : (
          <Path
            d={mood === 'calm' ? 'M45 63 Q 50 66 55 63' : 'M42 61 Q 50 70 58 61'}
            stroke={colors.ink}
            strokeWidth={2.5}
            fill="none"
            strokeLinecap="round"
          />
        )}
        {mood === 'cheer' ? (
          <G>
            <Polygon points={starPoints(12, 18, 7, 3)} fill={colors.star} />
            <Polygon points={starPoints(88, 14, 6, 2.5)} fill={colors.star} />
            <Polygon points={starPoints(90, 40, 4, 1.8)} fill={colors.star} />
          </G>
        ) : null}
      </Svg>
    </Animated.View>
  );
}

/** Mascot with a speech bubble; the text is shown for readers and spoken on tap for pre-readers. */
export function MascotSays({
  text,
  mood = 'happy',
  size = 96,
  speakOnMount = false,
}: {
  text: string;
  mood?: MascotMood;
  size?: number;
  speakOnMount?: boolean;
}) {
  // Speak the first message once when the screen opens (for pre-readers); later text
  // changes are announced by the action that caused them, so don't repeat here.
  const spoken = useRef(false);
  useEffect(() => {
    if (speakOnMount && text && !spoken.current) {
      spoken.current = true;
      speak(text);
    }
  }, [speakOnMount, text]);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
      <Mascot size={size} mood={mood} />
      <View
        style={[
          {
            flex: 1,
            backgroundColor: colors.surface,
            borderRadius: radius.lg,
            padding: space.md,
            flexDirection: 'row',
            alignItems: 'center',
            gap: space.sm,
          },
          shadow.card,
        ]}
      >
        <Txt variant="label" style={{ flex: 1 }}>
          {text}
        </Txt>
        <IconButton
          icon="volume-high"
          label="Hear it"
          onPress={() => speak(text)}
          size={64}
          tone="star"
        />
      </View>
    </View>
  );
}
