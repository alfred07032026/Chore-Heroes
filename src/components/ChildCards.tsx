import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import type { TaskInstance } from '@/domain/types';
import type { ShopItem } from '@/services/rewards';
import { useReduceMotion } from '@/state/appStore';
import { colors, radius, shadow, space, touch } from '@/theme/tokens';

import { Button, IconButton } from './Button';
import { Icon, IconBubble } from './Icon';
import { Pressy } from './Pressy';
import { StarRow } from './Stars';
import { Txt } from './Txt';

export function spokenTask(i: Pick<TaskInstance, 'title' | 'stars'>): string {
  return `${i.title}. ${i.stars} ${i.stars === 1 ? 'star' : 'stars'}.`;
}

/** Big tappable job card. Tap = check it off; speaker = hear the job's name. */
export function TaskCard({
  instance,
  onPress,
  onSpeak,
  compact,
}: {
  instance: TaskInstance;
  onPress: () => void;
  onSpeak: () => void;
  compact?: boolean;
}) {
  const reduce = useReduceMotion();
  const { status } = instance;
  const done = status === 'done';
  const waiting = status === 'waiting';
  const a11y = done
    ? `${instance.title}. Done!`
    : waiting
      ? `${instance.title}. Waiting for a grown-up to check.`
      : `${spokenTask(instance)} Tap to check it off.`;

  return (
    <Animated.View
      style={{ flex: 1 }}
      layout={reduce ? undefined : LinearTransition.springify().damping(16)}
      entering={reduce ? undefined : FadeIn.duration(250)}
      exiting={reduce ? undefined : FadeOut.duration(150)}
    >
      <Pressy
        testID={`task-${instance.title}`}
        onPress={onPress}
        accessibilityLabel={a11y}
        accessibilityState={{ checked: done }}
        style={[
          styles.card,
          { flex: 1 },
          shadow.card,
          compact && styles.compact,
          done && { backgroundColor: colors.successLight },
          waiting && { backgroundColor: colors.waitingLight },
          instance.returned && !done && !waiting && { borderColor: colors.flame, borderWidth: 3 },
        ]}
      >
        <View style={styles.topRow}>
          <IconBubble
            name={instance.icon}
            size={compact ? 64 : 96}
            color={done ? colors.success : waiting ? colors.waiting : colors.hero}
            background={done ? colors.white : waiting ? colors.white : colors.heroLight}
          />
          {!compact ? (
            <IconButton
              icon="volume-high"
              label={`Hear: ${instance.title}`}
              onPress={onSpeak}
              size={touch.child}
              tone="star"
            />
          ) : null}
        </View>
        <Txt variant={compact ? 'label' : 'heading'} numberOfLines={3}>
          {instance.title}
        </Txt>
        <View style={styles.bottomRow}>
          <StarRow count={instance.stars} size={compact ? 20 : 28} />
          {done ? (
            <View style={[styles.status, { backgroundColor: colors.success }]}>
              <Icon name="check-bold" size={compact ? 26 : 34} color={colors.white} />
            </View>
          ) : waiting ? (
            <View style={[styles.status, { backgroundColor: colors.waiting }]}>
              <Icon name="clock-outline" size={compact ? 26 : 34} color={colors.white} />
            </View>
          ) : (
            <View style={[styles.status, styles.todo]}>
              <Icon name="gesture-tap" size={compact ? 24 : 30} color={colors.hero} />
            </View>
          )}
        </View>
        {instance.returned && status === 'todo' ? (
          <View style={styles.note}>
            <Icon name="replay" size={22} color={colors.flame} />
            <Txt variant="caption" weight="bold" style={{ flexShrink: 1 }}>
              {instance.parentNote ?? 'Try again!'}
            </Txt>
          </View>
        ) : null}
        {done && instance.parentNote ? (
          <View style={[styles.note, { backgroundColor: colors.white }]}>
            <Icon name="heart" size={22} color={colors.danger} />
            <Txt variant="caption" weight="bold" style={{ flexShrink: 1 }}>
              {instance.parentNote}
            </Txt>
          </View>
        ) : null}
      </Pressy>
    </Animated.View>
  );
}

/** Reward card in the shop. Affordable rewards glow; the rest show how far away they are. */
export function RewardCard({
  item,
  onGet,
  onSpeak,
}: {
  item: ShopItem;
  onGet: () => void;
  onSpeak: () => void;
}) {
  const { reward, affordable, missing, limitReached, pending } = item;
  const canGet = affordable && !limitReached;
  const progress = reward.cost > 0 ? Math.min(1, (reward.cost - missing) / reward.cost) : 1;
  return (
    <View
      style={[
        styles.card,
        { flex: 1 },
        shadow.card,
        canGet && { borderColor: colors.star, borderWidth: 4, backgroundColor: '#FFFBEA' },
        !canGet && { opacity: 0.92 },
      ]}
    >
      <View style={styles.topRow}>
        <IconBubble
          name={reward.icon}
          size={96}
          color={canGet ? colors.starDeep : colors.inkSoft}
          background={canGet ? colors.starLight : colors.surfaceAlt}
        />
        <IconButton
          icon="volume-high"
          label={`Hear: ${reward.title}`}
          onPress={onSpeak}
          size={touch.child}
          tone="star"
        />
      </View>
      <Txt variant="heading" numberOfLines={3}>
        {reward.title}
      </Txt>
      <View
        style={{ flexDirection: 'row', alignItems: 'center', gap: space.xxs }}
        accessible
        accessibilityLabel={`Costs ${reward.cost} stars`}
      >
        <Icon name="star" size={30} color={colors.star} />
        <Txt variant="title">{reward.cost}</Txt>
      </View>
      {pending ? (
        <View style={[styles.note, { backgroundColor: colors.waitingLight }]}>
          <Icon name="clock-outline" size={24} color={colors.waiting} />
          <Txt variant="caption" weight="bold">
            Waiting for a grown-up
          </Txt>
        </View>
      ) : null}
      {limitReached ? (
        <View style={[styles.note, { backgroundColor: colors.skyLight }]}>
          <Icon name="calendar-refresh" size={24} color={colors.sky} />
          <Txt variant="caption" weight="bold">
            All used up this week. Back next week!
          </Txt>
        </View>
      ) : canGet ? (
        <Button
          label="Get it"
          icon="gift"
          tone="star"
          size="child"
          onPress={onGet}
          testID={`get-${reward.title}`}
        />
      ) : (
        <View
          accessible
          accessibilityLabel={`${missing} more stars needed`}
          style={{ gap: space.xxs }}
        >
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
          <Txt variant="caption" weight="bold" color={colors.inkSoft}>
            {missing} more ★ to go
          </Txt>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: space.md,
    gap: space.sm,
    minHeight: 220,
    borderWidth: 0,
    borderColor: 'transparent',
  },
  compact: { minHeight: 0, padding: space.sm, gap: space.xs },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
  },
  status: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todo: { borderWidth: 3, borderColor: colors.hero, borderStyle: 'dashed' },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    backgroundColor: colors.flameLight,
    borderRadius: radius.md,
    padding: space.xs,
  },
  track: { height: 14, borderRadius: 7, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: 14, borderRadius: 7, backgroundColor: colors.star },
});
