import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';

import { useReduceMotion } from '@/state/appStore';
import { colors, radius, shadow, space } from '@/theme/tokens';

import { Icon } from './Icon';
import { Txt } from './Txt';

/** Small auto-hiding banner at the bottom of the screen. */
export function Toast({
  message,
  icon = 'information',
  onHide,
  ms = 2800,
}: {
  message: string | null;
  icon?: string;
  onHide: () => void;
  ms?: number;
}) {
  const reduce = useReduceMotion();
  useEffect(() => {
    if (!message) return;
    const id = setTimeout(onHide, ms);
    return () => clearTimeout(id);
  }, [message, ms, onHide]);
  if (!message) return null;
  return (
    <View pointerEvents="none" style={styles.wrap}>
      <Animated.View
        entering={reduce ? undefined : FadeInUp}
        exiting={reduce ? undefined : FadeOutDown}
        style={[styles.toast, shadow.raised]}
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
      >
        <Icon name={icon} size={28} color={colors.star} />
        <Txt variant="label" color={colors.white} style={{ flexShrink: 1 }}>
          {message}
        </Txt>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: space.xl,
    alignItems: 'center',
    paddingHorizontal: space.md,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.ink,
    borderRadius: radius.round,
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
    maxWidth: 560,
  },
});
