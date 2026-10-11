import { useEffect, useEffectEvent, useMemo } from 'react';
import { AccessibilityInfo, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';

import { badgeById } from '@/domain/badges';
import { useReduceMotion } from '@/state/appStore';
import { colors, radius, shadow, space } from '@/theme/tokens';

import { Button } from './Button';
import { Icon } from './Icon';
import { Mascot } from './Mascot';
import { StarGlyph } from './Stars';
import { Txt } from './Txt';

function Particle({
  angle,
  distance,
  delay,
  icon,
  color,
}: {
  angle: number;
  distance: number;
  delay: number;
  icon: string;
  color: string;
}) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }));
  }, [t, delay]);
  const style = useAnimatedStyle(() => ({
    opacity: t.value < 0.7 ? 1 : 1 - (t.value - 0.7) / 0.3,
    transform: [
      { translateX: Math.cos(angle) * distance * t.value },
      { translateY: Math.sin(angle) * distance * t.value + 40 * t.value * t.value },
      { scale: 0.4 + t.value * 0.8 },
      { rotate: `${t.value * 180}deg` },
    ],
  }));
  return (
    <Animated.View style={[styles.particle, style]}>
      <Icon name={icon} size={30} color={color} />
    </Animated.View>
  );
}

/** Star burst + mascot cheer after a job is done. Auto-closes; tap anywhere to close sooner. */
export function Celebration({
  visible,
  stars,
  message,
  onDone,
  durationMs = 2200,
  icon = 'gift',
}: {
  visible: boolean;
  /** Stars won; 0 shows `icon` instead (e.g. a reward was redeemed). */
  stars: number;
  icon?: string;
  message: string;
  onDone: () => void;
  durationMs?: number;
}) {
  const reduce = useReduceMotion();
  const particles = useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        angle: (i / 14) * Math.PI * 2,
        distance: 140 + (i % 3) * 40,
        delay: (i % 4) * 40,
        icon: i % 3 === 0 ? 'star-four-points' : 'star',
        color: i % 2 === 0 ? colors.star : '#FF8FA3',
      })),
    [],
  );
  const pop = useSharedValue(1);
  // Stable callback: parent re-renders must not restart the auto-close timer.
  const finish = useEffectEvent(() => onDone());
  useEffect(() => {
    if (!visible) return;
    if (!reduce) pop.value = withSequence(withSpring(1.25), withSpring(1));
    AccessibilityInfo.announceForAccessibility(
      stars > 0 ? `${message} Plus ${stars} ${stars === 1 ? 'star' : 'stars'}.` : message,
    );
    // Screen-reader users get more time before it closes on its own.
    let id: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    // react-native-web always reports a screen reader, so only trust this on devices.
    const srCheck =
      Platform.OS === 'web' ? Promise.resolve(false) : AccessibilityInfo.isScreenReaderEnabled();
    void srCheck
      .catch(() => false)
      .then((sr) => {
        if (!cancelled) id = setTimeout(finish, sr ? Math.max(durationMs, 7000) : durationMs);
      });
    return () => {
      cancelled = true;
      if (id) clearTimeout(id);
    };
  }, [visible, durationMs, reduce, pop, stars, message]);
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  if (!visible) return null;
  return (
    <Modal
      transparent
      visible
      animationType="none"
      onRequestClose={onDone}
      supportedOrientations={['portrait', 'landscape']}
    >
      <Pressable
        style={styles.backdrop}
        onPress={onDone}
        accessibilityLabel="Close celebration"
        testID="celebration"
      >
        <Animated.View entering={reduce ? undefined : FadeIn.duration(150)} style={styles.center}>
          {!reduce ? particles.map((p, i) => <Particle key={i} {...p} />) : null}
          <Animated.View entering={reduce ? undefined : ZoomIn.springify()} style={styles.center}>
            <Mascot size={180} mood="cheer" animate={false} />
            <Animated.View style={[styles.plus, shadow.raised, popStyle]}>
              {stars > 0 ? (
                <>
                  <StarGlyph size={44} />
                  <Txt variant="hero" color={colors.ink} maxFontSizeMultiplier={1.1}>
                    +{stars}
                  </Txt>
                </>
              ) : (
                <Icon name={icon} size={64} color={colors.hero} />
              )}
            </Animated.View>
            <Txt
              variant="title"
              color={colors.white}
              center
              style={{ marginTop: space.md, maxWidth: 420 }}
            >
              {message}
            </Txt>
          </Animated.View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

/** Full-screen badge unlock moment. */
export function BadgeUnlock({ badgeId, onClose }: { badgeId: string | null; onClose: () => void }) {
  const reduce = useReduceMotion();
  const badge = badgeId ? badgeById(badgeId) : undefined;
  const spin = useSharedValue(0);
  useEffect(() => {
    if (badge && !reduce) {
      spin.value = 0;
      spin.value = withSpring(1, { damping: 8, stiffness: 80 });
    }
  }, [badge, reduce, spin]);
  const style = useAnimatedStyle(() => ({
    transform: [
      { scale: reduce ? 1 : 0.3 + spin.value * 0.7 },
      { rotate: reduce ? '0deg' : `${(1 - spin.value) * -90}deg` },
    ],
  }));
  if (!badge) return null;
  return (
    <Modal
      transparent
      visible
      animationType={reduce ? 'none' : 'fade'}
      onRequestClose={onClose}
      supportedOrientations={['portrait', 'landscape']}
    >
      <View style={styles.backdrop} testID="badge-unlock">
        <View style={[styles.badgeCard, shadow.raised]}>
          <Txt variant="heading" color={colors.hero} center>
            New badge!
          </Txt>
          <Animated.View style={[styles.badgeCircle, { backgroundColor: badge.color }, style]}>
            <Icon name={badge.icon} size={96} color={colors.white} />
          </Animated.View>
          <Txt variant="display" center>
            {badge.name}
          </Txt>
          <Txt variant="body" center color={colors.inkSoft}>
            {badge.howTo}
          </Txt>
          <Button
            label="Yay!"
            icon="check-bold"
            size="child"
            tone="success"
            onPress={onClose}
            testID="badge-close"
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.lg,
  },
  center: { alignItems: 'center', justifyContent: 'center' },
  particle: { position: 'absolute' },
  plus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    backgroundColor: colors.white,
    borderRadius: radius.round,
    paddingHorizontal: space.lg,
    paddingVertical: space.xs,
    marginTop: -space.md,
  },
  badgeCard: {
    backgroundColor: colors.bg,
    borderRadius: radius.xl,
    padding: space.xl,
    alignItems: 'center',
    gap: space.md,
    maxWidth: 460,
    width: '100%',
  },
  badgeCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 8,
    borderColor: colors.star,
  },
});
