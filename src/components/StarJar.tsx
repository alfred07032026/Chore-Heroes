import { useEffect, useId } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { ClipPath, Defs, G, Path, Polygon, Rect } from 'react-native-svg';

import { useReduceMotion } from '@/state/appStore';
import { colors } from '@/theme/tokens';

import { Txt } from './Txt';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

const JAR =
  'M28 18 L72 18 L72 26 Q 86 34 86 52 L 86 92 Q 86 106 72 106 L 28 106 Q 14 106 14 92 L 14 52 Q 14 34 28 26 Z';
const JAR_TOP = 30;
const JAR_BOTTOM = 106;

function star(cx: number, cy: number, r: number) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
}

// Decorative stars inside the jar (revealed as it fills).
const SPARKS = [
  [30, 96, 6],
  [52, 98, 7],
  [70, 94, 6],
  [40, 84, 5],
  [62, 82, 6],
  [28, 70, 5],
  [50, 68, 7],
  [72, 66, 5],
  [38, 54, 6],
  [62, 50, 5],
] as const;

/**
 * Star jar: visual balance for pre-readers. `goal` sets what "full" means
 * (e.g. the cheapest reward the child is saving for).
 */
export function StarJar({
  balance,
  goal,
  size = 160,
  showNumber = true,
}: {
  balance: number;
  goal: number;
  size?: number;
  showNumber?: boolean;
}) {
  const reduce = useReduceMotion();
  // SVG ids are document-global on web; several jars can be mounted at once (navigation stack).
  const clipId = `jarClip${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const fraction = goal > 0 ? Math.max(0, Math.min(1, balance / goal)) : 0;
  const level = useSharedValue(0);
  useEffect(() => {
    level.value = reduce
      ? withTiming(fraction, { duration: 0 })
      : withSpring(fraction, { damping: 14, stiffness: 90 });
  }, [fraction, reduce, level]);
  const fillProps = useAnimatedProps(() => {
    // Springs overshoot; keep the fill inside the jar (and never a negative SVG height).
    const h = (JAR_BOTTOM - JAR_TOP) * Math.min(1, Math.max(0, level.value));
    return { y: JAR_BOTTOM - h, height: h };
  });
  const height = size * 1.15;
  return (
    <View
      style={{ width: size, alignItems: 'center' }}
      accessible
      accessibilityLabel={`Star jar: ${balance} ${balance === 1 ? 'star' : 'stars'}`}
    >
      <Svg width={size} height={height} viewBox="0 0 100 115">
        <Defs>
          <ClipPath id={clipId}>
            <Path d={JAR} />
          </ClipPath>
        </Defs>
        <Path d={JAR} fill="#EAF4FF" />
        <G clipPath={`url(#${clipId})`}>
          <AnimatedRect x={0} width={100} fill={colors.star} animatedProps={fillProps} />
          {SPARKS.map(([x, y, r], i) => (
            <Polygon
              key={i}
              points={star(x, y, r)}
              fill="#FFE27A"
              opacity={y > JAR_BOTTOM - (JAR_BOTTOM - JAR_TOP) * fraction ? 1 : 0}
            />
          ))}
        </G>
        <Path d={JAR} fill="none" stroke={colors.sky} strokeWidth={4} strokeLinejoin="round" />
        <Rect x={24} y={8} width={52} height={14} rx={6} fill={colors.hero} />
        <Path
          d="M24 40 Q 20 60 22 80"
          stroke={colors.white}
          strokeWidth={4}
          strokeLinecap="round"
          opacity={0.7}
          fill="none"
        />
      </Svg>
      {showNumber ? (
        <View style={{ position: 'absolute', top: height * 0.42, alignItems: 'center' }}>
          <Txt
            variant={size >= 140 ? 'display' : 'title'}
            color={colors.ink}
            maxFontSizeMultiplier={1.2}
          >
            {balance}
          </Txt>
        </View>
      ) : null}
    </View>
  );
}
