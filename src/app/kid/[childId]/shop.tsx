import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { IconButton } from '@/components/Button';
import { Card } from '@/components/Card';
import { BadgeUnlock, Celebration } from '@/components/Celebration';
import { RewardCard } from '@/components/ChildCards';
import { Icon, IconBubble } from '@/components/Icon';
import { Mascot, MascotSays } from '@/components/Mascot';
import { EmptyState, Grid, TwoPane, useGridColumns } from '@/components/Misc';
import { Screen } from '@/components/Screen';
import { Sheet } from '@/components/Sheet';
import { StarJar } from '@/components/StarJar';
import { TopBar } from '@/components/TopBar';
import { Txt } from '@/components/Txt';
import type { Redemption, Reward } from '@/domain/types';
import { useLayout } from '@/hooks/useLayout';
import { useQuery } from '@/hooks/useQuery';
import { feedback } from '@/platform/feedback';
import { speak } from '@/platform/speech';
import { markBadgesSeen } from '@/services/badges';
import { getChild } from '@/services/children';
import { getShop, markDecisionsSeen, requestReward, unseenDecisions } from '@/services/rewards';
import { mutate, useAppStore } from '@/state/appStore';
import { colors, space, touch } from '@/theme/tokens';

type Phase = { kind: 'confirm'; reward: Reward } | { kind: 'sent'; reward: Reward } | null;

export default function Shop() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const today = useAppStore((s) => s.today);
  const { twoPane } = useLayout();
  const columns = useGridColumns(240, 3, 300);
  const [phase, setPhase] = useState<Phase>(null);
  const [celebrate, setCelebrate] = useState<string | null>(null);
  const [badge, setBadge] = useState<string | null>(null);
  const [news, setNews] = useState<Redemption[]>([]);

  const q = useQuery(
    async (db) => {
      const child = await getChild(db, childId);
      const shop = await getShop(db, childId, today);
      return { child, shop };
    },
    [childId, today],
  );

  useEffect(() => {
    void mutate(async (db) => {
      const items = await unseenDecisions(db, childId);
      if (items.length) await markDecisionsSeen(db, childId);
      return items;
    }).then((items) => {
      if (items.length) {
        setNews(items);
        const first = items[0]!;
        speak(
          first.status === 'approved'
            ? `Yay! A grown-up said yes to ${first.title}!`
            : `Not this time for ${first.title}. Your stars are back in your jar.`,
        );
      }
    });
  }, [childId]);

  const data = q.data;
  if (!data?.child) return <Screen>{null}</Screen>;
  const { shop } = data;
  const goal = Math.max(...shop.items.map((i) => i.reward.cost), 20);

  const ask = async (reward: Reward) => {
    const r = await mutate((db) => requestReward(db, childId, reward.id));
    if (r.kind === 'requested') {
      feedback({
        sound: 'coin',
        haptic: 'success',
        say: `Asked! A grown-up will check ${reward.title}.`,
      });
      setPhase({ kind: 'sent', reward });
    } else if (r.kind === 'redeemed') {
      setPhase(null);
      feedback({
        sound: 'celebrate',
        haptic: 'success',
        say: `Yay! ${reward.title}! Show a grown-up!`,
      });
      setCelebrate(reward.title);
      if (r.newBadges[0]) setBadge(r.newBadges[0]);
    } else {
      setPhase(null);
      feedback({ sound: 'gentle', say: 'Not yet! Keep collecting stars.' });
    }
  };

  const intro =
    shop.items.length === 0
      ? 'No rewards yet. Ask a grown-up to add some!'
      : shop.items.some((i) => i.affordable && !i.limitReached)
        ? `You have ${shop.balance} stars! The shiny ones are ready.`
        : `You have ${shop.balance} stars. Keep going!`;

  const jar = (
    <Card
      style={{
        alignItems: 'center',
        gap: space.sm,
        flexDirection: twoPane ? 'column' : 'row',
        justifyContent: 'center',
      }}
    >
      <StarJar balance={shop.balance} goal={goal} size={twoPane ? 200 : 110} />
      <Txt variant={twoPane ? 'label' : 'title'} center>
        {twoPane ? 'My stars' : `${shop.balance} ★`}
      </Txt>
    </Card>
  );

  return (
    <View style={{ flex: 1 }}>
      <Screen
        header={
          <TopBar
            child
            onBack={() => router.back()}
            backLabel="Back to my jobs"
            title="Rewards"
            right={
              <IconButton
                icon="volume-high"
                label="Hear it"
                tone="star"
                size={touch.child}
                onPress={() => speak(intro)}
              />
            }
          />
        }
      >
        <TwoPane
          sideFirst
          side={jar}
          sideWidth={300}
          main={
            <View style={{ gap: space.md }}>
              <MascotSays text={intro} speakOnMount={news.length === 0} />
              {shop.items.length === 0 ? (
                <EmptyState
                  title="No rewards yet"
                  body="A grown-up can add rewards in the grown-ups area."
                />
              ) : (
                <Grid columns={columns}>
                  {shop.items.map((item) => (
                    <RewardCard
                      key={item.reward.id}
                      item={item}
                      onSpeak={() =>
                        speak(
                          `${item.reward.title}. ${item.reward.cost} stars.${
                            item.limitReached
                              ? ' All used up this week.'
                              : item.affordable
                                ? ' You can get it!'
                                : ` ${item.missing} more stars to go.`
                          }`,
                        )
                      }
                      onGet={() => {
                        feedback({ sound: 'tap', say: `${item.reward.title}? Ask a grown-up!` });
                        setPhase({ kind: 'confirm', reward: item.reward });
                      }}
                    />
                  ))}
                </Grid>
              )}
            </View>
          }
        />
      </Screen>

      <Sheet visible={!!phase} onClose={() => setPhase(null)} width={520}>
        {phase ? (
          <View style={{ alignItems: 'center', gap: space.md }} testID={`shop-${phase.kind}`}>
            <IconBubble
              name={phase.reward.icon}
              size={120}
              color={colors.starDeep}
              background={colors.starLight}
            />
            <Txt variant="title" center>
              {phase.reward.title}
            </Txt>
            {phase.kind === 'confirm' ? (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                  <Icon name="account-supervisor" size={40} color={colors.hero} />
                  <Txt variant="heading" center>
                    Ask a grown-up?
                  </Txt>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xxs }}>
                  <Icon name="star" size={30} color={colors.star} />
                  <Txt variant="title">{phase.reward.cost}</Txt>
                </View>
                <View style={{ flexDirection: 'row', gap: space.lg }}>
                  <IconButton
                    icon="close-thick"
                    label="No, go back"
                    size={touch.childLarge}
                    tone="secondary"
                    onPress={() => setPhase(null)}
                    testID="shop-no"
                  />
                  <IconButton
                    icon="check-bold"
                    label="Yes, ask a grown-up"
                    size={touch.childLarge}
                    tone="success"
                    onPress={() => void ask(phase.reward)}
                    testID="shop-yes"
                  />
                </View>
              </>
            ) : (
              <>
                <Mascot size={120} mood="cheer" />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                  <Icon name="clock-outline" size={36} color={colors.waiting} />
                  <Txt variant="heading" center>
                    Sent! A grown-up will check.
                  </Txt>
                </View>
                <IconButton
                  icon="check-bold"
                  label="Okay"
                  size={touch.childLarge}
                  tone="success"
                  onPress={() => setPhase(null)}
                  testID="shop-ok"
                />
              </>
            )}
          </View>
        ) : null}
      </Sheet>

      <Sheet
        visible={news.length > 0 && !phase}
        onClose={() => setNews((n) => n.slice(1))}
        width={520}
      >
        {news[0] ? (
          <View style={{ alignItems: 'center', gap: space.md }}>
            <Mascot size={120} mood={news[0].status === 'approved' ? 'cheer' : 'calm'} />
            <IconBubble
              name={news[0].icon}
              size={96}
              color={colors.starDeep}
              background={colors.starLight}
            />
            <Txt variant="title" center>
              {news[0].status === 'approved'
                ? `Yes! ${news[0].title}`
                : `Not this time: ${news[0].title}`}
            </Txt>
            {news[0].status === 'rejected' ? (
              <Txt variant="body" center>
                Your {news[0].cost} stars are back in your jar.
              </Txt>
            ) : null}
            {news[0].parentNote ? (
              <Txt variant="label" center color={colors.hero}>
                “{news[0].parentNote}”
              </Txt>
            ) : null}
            <IconButton
              icon="check-bold"
              label="Okay"
              size={touch.childLarge}
              tone="success"
              onPress={() => setNews((n) => n.slice(1))}
            />
          </View>
        ) : null}
      </Sheet>

      <Celebration
        visible={!!celebrate}
        stars={0}
        icon="gift"
        message={`${celebrate ?? ''}! Show a grown-up!`}
        onDone={() => setCelebrate(null)}
      />
      {!celebrate ? (
        <BadgeUnlock
          badgeId={badge}
          onClose={() => {
            if (badge) void mutate((db) => markBadgesSeen(db, childId, [badge]));
            setBadge(null);
          }}
        />
      ) : null}
    </View>
  );
}
