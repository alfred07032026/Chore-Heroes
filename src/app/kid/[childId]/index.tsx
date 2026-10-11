import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Button, IconButton } from '@/components/Button';
import { Card, SectionTitle } from '@/components/Card';
import { BadgeUnlock, Celebration } from '@/components/Celebration';
import { spokenTask, TaskCard } from '@/components/ChildCards';
import { Flame } from '@/components/Flame';
import { MascotSays } from '@/components/Mascot';
import { EmptyState, Grid, TwoPane, useGridColumns } from '@/components/Misc';
import { Pressy } from '@/components/Pressy';
import { Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { StarJar } from '@/components/StarJar';
import { Toast } from '@/components/Toast';
import { Txt } from '@/components/Txt';
import { badgeById } from '@/domain/badges';
import { toDateKey } from '@/domain/dates';
import { streakMessage } from '@/domain/streaks';
import type { TaskInstance } from '@/domain/types';
import { useLayout } from '@/hooks/useLayout';
import { useQuery } from '@/hooks/useQuery';
import { feedback } from '@/platform/feedback';
import { speak } from '@/platform/speech';
import { markBadgesSeen, unseenBadges } from '@/services/badges';
import { getChild } from '@/services/children';
import { completeInstance, getToday, undoInstance } from '@/services/instances';
import { getBalance } from '@/services/ledger';
import { listRewards } from '@/services/rewards';
import { getStreak } from '@/services/stats';
import { mutate, requireDb, useAppStore } from '@/state/appStore';
import { colors, radius, shadow, space, touch } from '@/theme/tokens';

const CHEERS = ['Great job', 'Awesome', 'Super hero', 'Way to go', 'You did it'];

/** Next reward to save for = cheapest reward costing more than the balance. */
function jarGoal(balance: number, costs: number[]): number {
  const sorted = [...costs].sort((a, b) => a - b);
  return sorted.find((c) => c > balance) ?? sorted[sorted.length - 1] ?? 20;
}

export default function Today() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const today = useAppStore((s) => s.today);
  const { twoPane } = useLayout();
  const columns = useGridColumns(230, 4, 340);
  const [celebrate, setCelebrate] = useState<{ stars: number; message: string } | null>(null);
  const [badgeQueue, setBadgeQueue] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [undoTarget, setUndoTarget] = useState<TaskInstance | null>(null);
  const [busy, setBusy] = useState(false);

  const q = useQuery(
    async (db) => {
      const child = await getChild(db, childId);
      if (!child) return null;
      const [board, balance, streak, rewards] = await Promise.all([
        getToday(db, childId, today),
        getBalance(db, childId),
        getStreak(db, childId, today),
        listRewards(db),
      ]);
      return {
        child,
        board,
        balance,
        streak,
        goal: jarGoal(
          balance,
          rewards.map((r) => r.cost),
        ),
      };
    },
    [childId, today],
  );

  // Badges earned while away (e.g. a parent approved a job) are celebrated on arrival.
  useEffect(() => {
    void unseenBadges(requireDb(), childId).then(
      (ids) => ids.length && setBadgeQueue((q) => [...new Set([...q, ...ids])]),
    );
  }, [childId]);

  const data = q.data;
  const child = data?.child;

  const greeting = data
    ? data.board.todo.length === 0 && data.board.waiting.length === 0 && data.board.done.length > 0
      ? `All done, ${child?.name}! You're a superhero!`
      : data.board.todo.length === 0 &&
          data.board.done.length === 0 &&
          data.board.waiting.length === 0
        ? `No jobs today, ${child?.name}. Enjoy your day!`
        : `Hi ${child?.name}! ${data.board.todo.length} ${data.board.todo.length === 1 ? 'job' : 'jobs'} to do.`
    : '';

  const onTask = useCallback(
    async (inst: TaskInstance) => {
      if (inst.status !== 'todo') {
        setUndoTarget(inst);
        speak(
          inst.status === 'waiting'
            ? `${inst.title}. Waiting for a grown-up.`
            : `${inst.title}. Done!`,
        );
        return;
      }
      if (busy) return;
      setBusy(true);
      feedback({ haptic: 'tap' });
      try {
        const result = await mutate((db) => completeInstance(db, inst.id));
        if (result.kind === 'done') {
          const cheer = CHEERS[Math.floor(Math.random() * CHEERS.length)]!;
          feedback({
            sound: 'celebrate',
            haptic: 'success',
            say: `${cheer}! Plus ${result.stars} ${result.stars === 1 ? 'star' : 'stars'}!`,
          });
          setCelebrate({ stars: result.stars, message: `${cheer}!` });
          if (result.newBadges.length) setBadgeQueue((q) => [...q, ...result.newBadges]);
        } else if (result.kind === 'waiting') {
          feedback({
            sound: 'success',
            haptic: 'success',
            say: 'Great job! A grown-up will check it.',
          });
          setToast('Great job! A grown-up will check it.');
        } else if (result.kind === 'expired') {
          feedback({ sound: 'gentle', say: "It's a new day! Here are today's jobs." });
          useAppStore.getState().setToday(toDateKey(new Date()));
        }
      } finally {
        setBusy(false);
      }
    },
    [busy],
  );

  const doUndo = async () => {
    if (!undoTarget) return;
    const r = await mutate((db) => undoInstance(db, undoTarget.id));
    setUndoTarget(null);
    if (r.kind === 'undone') feedback({ sound: 'gentle', say: 'Okay! It is back on your list.' });
    else if (r.kind === 'stars_spent') setToast('Those stars were already spent. Ask a grown-up.');
    else setToast('A grown-up already checked this one.');
  };

  const closeBadge = useCallback(() => {
    setBadgeQueue((q) => {
      const [first, ...rest] = q;
      if (first) void mutate((db) => markBadgesSeen(db, childId, [first]));
      return rest;
    });
  }, [childId]);

  useEffect(() => {
    const id = !celebrate ? badgeQueue[0] : undefined;
    const b = id ? badgeById(id) : undefined;
    if (b) feedback({ sound: 'badge', haptic: 'success', say: `New badge! ${b.name}!` });
  }, [badgeQueue, celebrate]);

  if (q.data === null) {
    return (
      <Screen>
        <EmptyState
          title="Hero not found"
          action={<Button label="Back" onPress={() => router.replace('/kids')} />}
        />
      </Screen>
    );
  }
  if (!data || !child) return <Screen>{null}</Screen>;

  const goShop = () => {
    feedback({ sound: 'tap', say: 'Rewards!' });
    router.push({ pathname: '/kid/[childId]/shop', params: { childId } });
  };
  const goProgress = () => {
    feedback({ sound: 'tap', say: 'My badges!' });
    router.push({ pathname: '/kid/[childId]/progress', params: { childId } });
  };

  const cards = (list: TaskInstance[], compact = false) => (
    <Grid columns={compact ? Math.min(columns + 1, 5) : columns}>
      {list.map((i) => (
        <TaskCard
          key={i.id}
          instance={i}
          compact={compact}
          onPress={() => void onTask(i)}
          onSpeak={() => speak(spokenTask(i))}
        />
      ))}
    </Grid>
  );

  const header = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.sm,
        paddingVertical: space.sm,
      }}
    >
      <Pressy
        onPress={() => router.dismissTo('/kids')}
        accessibilityLabel="Switch hero"
        testID="switch-hero"
        style={{ borderRadius: radius.round }}
      >
        <Avatar avatar={child.avatar} color={child.color} size={touch.child + 8} />
      </Pressy>
      <Txt variant="title" style={{ flex: 1 }} numberOfLines={1}>
        {child.name}
      </Txt>
      {!twoPane ? (
        <>
          <Pressy
            onPress={goProgress}
            accessibilityLabel={`My badges. Streak ${data.streak.current} days`}
            testID="open-progress"
          >
            <Flame days={data.streak.current} size={touch.child} />
          </Pressy>
          <Pressy
            onPress={goShop}
            accessibilityLabel={`Rewards shop. ${data.balance} stars`}
            testID="open-shop"
            style={[
              {
                backgroundColor: colors.surface,
                borderRadius: radius.lg,
                paddingHorizontal: space.xs,
              },
              shadow.card,
            ]}
          >
            <StarJar
              balance={data.balance}
              goal={data.goal}
              size={touch.child + 10}
              showNumber={false}
            />
            <View style={{ position: 'absolute', bottom: 2, alignSelf: 'center' }}>
              <Txt variant="label" weight="black">
                {data.balance}
              </Txt>
            </View>
          </Pressy>
        </>
      ) : null}
    </View>
  );

  const side = (
    <View style={{ gap: space.md }}>
      <Card style={{ alignItems: 'center', gap: space.sm }}>
        <Pressy
          onPress={goShop}
          accessibilityLabel={`Star jar. ${data.balance} stars. Open rewards`}
          testID="open-shop"
        >
          <StarJar balance={data.balance} goal={data.goal} size={180} />
        </Pressy>
        <Button label="Rewards" icon="gift" tone="star" size="child" onPress={goShop} full />
      </Card>
      <Card style={{ alignItems: 'center', gap: space.sm }}>
        <Pressy onPress={goProgress} accessibilityLabel="My badges" testID="open-progress">
          <Flame days={data.streak.current} size={110} />
        </Pressy>
        <Txt variant="body" center>
          {streakMessage(data.streak, child.name)}
        </Txt>
        <Button
          label="Badges"
          icon="medal"
          tone="secondary"
          size="child"
          onPress={goProgress}
          full
        />
      </Card>
    </View>
  );

  const main = (
    <View>
      <MascotSays
        speakOnMount
        text={greeting}
        mood={data.board.todo.length === 0 && data.board.done.length > 0 ? 'cheer' : 'happy'}
      />
      {data.board.todo.length > 0 ? (
        <>
          <SectionTitle>To do</SectionTitle>
          {cards(data.board.todo)}
        </>
      ) : null}
      {data.board.waiting.length > 0 ? (
        <>
          <SectionTitle>Waiting for a grown-up</SectionTitle>
          {cards(data.board.waiting, true)}
        </>
      ) : null}
      {data.board.done.length > 0 ? (
        <>
          <SectionTitle>Done!</SectionTitle>
          {cards(data.board.done, true)}
        </>
      ) : null}
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <Screen header={header}>
        <TwoPane main={main} side={twoPane ? side : null} sideWidth={340} />
      </Screen>
      <Toast message={toast} icon="clock-outline" onHide={() => setToast(null)} />
      <Celebration
        visible={!!celebrate}
        stars={celebrate?.stars ?? 0}
        message={celebrate?.message ?? ''}
        onDone={() => setCelebrate(null)}
      />
      {!celebrate ? <BadgeUnlock badgeId={badgeQueue[0] ?? null} onClose={closeBadge} /> : null}
      <Sheet visible={!!undoTarget} onClose={() => setUndoTarget(null)} width={480}>
        {undoTarget ? (
          <View style={{ alignItems: 'center', gap: space.md }}>
            <Txt variant="title" center>
              {undoTarget.title}
            </Txt>
            <Txt variant="body" center color={colors.inkSoft}>
              {undoTarget.status === 'waiting' ? 'Waiting for a grown-up to check.' : 'All done!'}
            </Txt>
            <View
              style={{
                flexDirection: 'row',
                gap: space.md,
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}
            >
              <IconButton
                icon="undo-variant"
                label="Oops, not done yet"
                size={touch.childLarge}
                tone="secondary"
                onPress={() => void doUndo()}
                testID="undo-yes"
              />
              <IconButton
                icon="check-bold"
                label="Yes, it's done"
                size={touch.childLarge}
                tone="success"
                onPress={() => setUndoTarget(null)}
                testID="undo-no"
              />
            </View>
          </View>
        ) : null}
      </Sheet>
    </View>
  );
}
