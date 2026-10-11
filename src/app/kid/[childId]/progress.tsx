import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { IconButton } from '@/components/Button';
import { Card, SectionTitle } from '@/components/Card';
import { Flame } from '@/components/Flame';
import { Icon } from '@/components/Icon';
import { MascotSays } from '@/components/Mascot';
import { Grid, TwoPane, useGridColumns } from '@/components/Misc';
import { Pressy } from '@/components/Pressy';
import { LoadingScreen } from '@/components/Loading';
import { Screen } from '@/components/Screen';
import { TopBar } from '@/components/TopBar';
import { Txt } from '@/components/Txt';
import { BADGES } from '@/domain/badges';
import { addDays, WEEKDAY_LONG, WEEKDAY_SHORT, dayOfWeek } from '@/domain/dates';
import { streakMessage } from '@/domain/streaks';
import { useQuery } from '@/hooks/useQuery';
import { feedback } from '@/platform/feedback';
import { speak } from '@/platform/speech';
import { listEarnedBadges } from '@/services/badges';
import { getChild } from '@/services/children';
import { activeDays, getStreak } from '@/services/stats';
import { useAppStore, useReduceMotion } from '@/state/appStore';
import { colors, radius, shadow, space, touch } from '@/theme/tokens';

export default function Progress() {
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const today = useAppStore((s) => s.today);
  const reduce = useReduceMotion();
  const columns = useGridColumns(170, 5, 340);
  const q = useQuery(
    async (db) => ({
      child: await getChild(db, childId),
      streak: await getStreak(db, childId, today),
      days: new Set(await activeDays(db, childId)),
      earned: await listEarnedBadges(db, childId),
    }),
    [childId, today],
  );
  const data = q.data;
  if (!data?.child) return <LoadingScreen />;
  const earned = new Map(data.earned.map((e) => [e.badgeId, e]));
  const message = streakMessage(data.streak, data.child.name);
  const last7 = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));

  const flameCard = (
    <Card style={{ alignItems: 'center', gap: space.md }}>
      <Flame days={data.streak.current} size={150} />
      <Txt variant="title" center>
        {data.streak.current} {data.streak.current === 1 ? 'day' : 'days'}
      </Txt>
      <View
        style={{ flexDirection: 'row', gap: space.xxs, flexWrap: 'wrap', justifyContent: 'center' }}
      >
        {last7.map((d) => {
          const on = data.days.has(d);
          return (
            <View
              key={d}
              style={{ alignItems: 'center', gap: 2 }}
              accessible
              accessibilityLabel={`${WEEKDAY_LONG[dayOfWeek(d)]}: ${on ? 'jobs done' : d === today ? 'today' : 'rest day'}`}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: on ? colors.flameLight : colors.surfaceAlt,
                  borderWidth: d === today ? 3 : 0,
                  borderColor: colors.hero,
                }}
              >
                <Icon
                  name={on ? 'fire' : 'circle-small'}
                  size={26}
                  color={on ? colors.flame : colors.inkSoft}
                />
              </View>
              <Txt variant="caption" maxFontSizeMultiplier={1.3}>
                {WEEKDAY_SHORT[dayOfWeek(d)]}
              </Txt>
            </View>
          );
        })}
      </View>
      {data.streak.best > 0 ? (
        <Txt variant="caption" color={colors.inkSoft} center>
          Best ever: {data.streak.best} {data.streak.best === 1 ? 'day' : 'days'}
        </Txt>
      ) : null}
    </Card>
  );

  const badges = (
    <View>
      <SectionTitle>{`Badges: ${earned.size} of ${BADGES.length}`}</SectionTitle>
      {/* One gentle fade for the grid instead of ten staggered zooms (less motion). */}
      <Animated.View entering={reduce ? undefined : FadeIn.duration(250)}>
        <Grid columns={columns}>
          {BADGES.map((b) => {
            const got = earned.has(b.id);
            return (
              <View key={b.id}>
                <Pressy
                  testID={`badge-${b.id}`}
                  onPress={() => {
                    feedback({ sound: 'tap' });
                    speak(got ? `${b.name}! You earned it!` : `${b.name}. ${b.howTo}`);
                  }}
                  accessibilityLabel={`${b.name}. ${got ? 'Earned!' : `Locked. ${b.howTo}`}`}
                  style={[
                    {
                      alignItems: 'center',
                      gap: space.xs,
                      padding: space.sm,
                      borderRadius: radius.lg,
                      backgroundColor: got ? colors.surface : colors.surfaceAlt,
                      minHeight: 170,
                      justifyContent: 'center',
                    },
                    got && shadow.card,
                  ]}
                >
                  <View
                    style={{
                      width: 92,
                      height: 92,
                      borderRadius: 46,
                      backgroundColor: got ? b.color : colors.lockedStrong,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 4,
                      borderColor: got ? colors.star : colors.white,
                    }}
                  >
                    <Icon name={got ? b.icon : 'lock'} size={48} color={colors.white} />
                  </View>
                  <Txt
                    variant="label"
                    center
                    color={got ? colors.ink : colors.inkSoft}
                    numberOfLines={2}
                  >
                    {b.name}
                  </Txt>
                </Pressy>
              </View>
            );
          })}
        </Grid>
      </Animated.View>
    </View>
  );

  return (
    <Screen
      header={
        <TopBar
          child
          onBack={() => router.back()}
          backLabel="Back to my jobs"
          title="My badges"
          right={
            <IconButton
              icon="volume-high"
              label="Hear it"
              tone="star"
              size={touch.child}
              onPress={() => speak(message)}
            />
          }
        />
      }
    >
      <View style={{ gap: space.md }}>
        <MascotSays
          text={message}
          mood={data.streak.current > 0 ? 'cheer' : 'happy'}
          speakOnMount
        />
        <TwoPane sideFirst side={flameCard} main={badges} sideWidth={340} />
      </View>
    </Screen>
  );
}
