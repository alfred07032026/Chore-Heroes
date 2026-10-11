import { type ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { useReduceMotion } from '@/state/appStore';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressyProps extends Omit<PressableProps, 'style' | 'children'> {
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
  /** How much to shrink while pressed (squishy, toy-like feel). */
  scaleTo?: number;
}

/** Pressable with a gentle squish animation (disabled when reduce motion is on). */
export function Pressy({
  style,
  children,
  scaleTo = 0.95,
  onPressIn,
  onPressOut,
  ...rest
}: PressyProps) {
  const reduce = useReduceMotion();
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      accessibilityRole="button"
      {...rest}
      onPressIn={(e) => {
        if (!reduce) scale.set(withSpring(scaleTo, { damping: 15, stiffness: 400 }));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.set(withSpring(1, { damping: 12, stiffness: 300 }));
        onPressOut?.(e);
      }}
      style={[style, animated]}
    >
      {children}
    </AnimatedPressable>
  );
}
