import { router } from 'expo-router';
import { View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card, SectionTitle } from '@/components/Card';
import { Icon } from '@/components/Icon';
import { Grid, TwoPane, useGridColumns } from '@/components/Misc';
import { ListRow } from '@/components/parent/ListRow';
import { Pressy } from '@/components/Pressy';
import { Screen } from '@/components/Screen';
import { StarPill } from '@/components/Stars';
import { TopBar } from '@/components/TopBar';
import { Txt } from '@/components/Txt';
import { useLayout } from '@/hooks/useLayout';
import { useQuery } from '@/hooks/useQuery';
import { countInbox } from '@/services/approvals';
import { listChildren } from '@/services/children';
import { backfillAll } from '@/services/instances';
import { getChildDashboard } from '@/services/stats';
import { useAppStore } from '@/state/appStore';
import { colors, radius, shadow, space } from '@/theme/tokens';

const NAV = [
  { href: '/parent/inbox', icon: 'inbox-arrow-down', label: 'Approvals' },
  { href: '/parent/tasks', icon: 'format-list-checks', label: 'Jobs' },
  { href: '/parent/rewards', icon: 'gift', label: 'Rewards' },
  { href: '/parent/children', icon: 'account-child', label: 'Children' },
  { href: '/parent/settings', icon: 'cog', label: 'Settings' },
] as const;

export default function ParentHome() {
  const today = useAppStore((s) => s.today);
  const lock = useAppStore((s) => s.lockParent);
  const { twoPane } = useLayout();
  const kidColumns = useGridColumns(300, 3);
  const q = useQuery(
    async (db) => {
      await backfillAll(db, today);
      const kids = await listChildren(db);
      const dashboards = await Promise.all(kids.map((k) => getChildDashboard(db, k.id, today)));
      return { kids, dashboards, inbox: await countInbox(db) };
    },
    [today],
  );
  const data = q.data;

  const exit = () => {
    lock();
    router.dismissTo('/kids');
  };

  const nav = (
    <View style={{ gap: space.sm }}>
      {NAV.map((n) => (
        <ListRow
          key={n.href}
          icon={n.icon}
          title={n.label}
          testID={`nav-${n.label}`}
          onPress={() => router.push(n.href)}
          right={
            n.href === '/parent/inbox' && data?.inbox ? (
              <View
                style={{
                  backgroundColor: colors.danger,
                  borderRadius: radius.round,
                  paddingHorizontal: space.sm,
                  paddingVertical: 2,
                }}
              >
                <Txt variant="label" color={colors.white}>
                  {data.inbox}
                </Txt>
              </View>
            ) : undefined
          }
        />
      ))}
    </View>
  );

  const kids = (
    <View>
      {data && data.inbox > 0 ? (
        <Pressy
          onPress={() => router.push('/parent/inbox')}
          accessibilityLabel={`${data.inbox} items waiting for your approval`}
          style={[
            {
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.md,
              backgroundColor: colors.hero,
              borderRadius: radius.lg,
              padding: space.md,
              marginBottom: space.md,
            },
            shadow.card,
          ]}
        >
          <Icon name="bell-ring" size={32} color={colors.star} />
          <Txt variant="heading" color={colors.white} style={{ flex: 1 }}>
            {data.inbox} {data.inbox === 1 ? 'thing is' : 'things are'} waiting for you
          </Txt>
          <Icon name="chevron-right" size={28} color={colors.white} />
        </Pressy>
      ) : null}
      <SectionTitle>This week</SectionTitle>
      <Grid columns={kidColumns}>
        {(data?.kids ?? []).map((k, i) => {
          const d = data!.dashboards[i]!;
          return (
            <Pressy
              key={k.id}
              testID={`dash-${k.name}`}
              onPress={() =>
                router.push({ pathname: '/parent/child/[childId]', params: { childId: k.id } })
              }
              accessibilityLabel={`${k.name}: ${d.balance} stars, ${d.starsThisWeek} earned this week`}
              scaleTo={0.98}
            >
              <Card style={{ gap: space.sm, borderTopWidth: 6, borderTopColor: k.color }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                  <Avatar avatar={k.avatar} color={k.color} size={56} />
                  <Txt variant="heading" style={{ flex: 1 }} numberOfLines={1}>
                    {k.name}
                  </Txt>
                  <StarPill value={d.balance} />
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
                  <Stat icon="star-plus" label="This week" value={`${d.starsThisWeek}★`} />
                  <Stat
                    icon="check-circle"
                    label="Done"
                    value={
                      d.completionRate === null ? '–' : `${Math.round(d.completionRate * 100)}%`
                    }
                  />
                  <Stat icon="fire" label="Streak" value={`${d.streak.current}d`} />
                </View>
              </Card>
            </Pressy>
          );
        })}
      </Grid>
    </View>
  );

  return (
    <Screen
      header={
        <TopBar
          title="Grown-ups"
          subtitle="Manage jobs, rewards and approvals"
          right={
            <Button label="Exit" icon="lock" tone="secondary" onPress={exit} testID="parent-exit" />
          }
        />
      }
    >
      {twoPane ? (
        <TwoPane side={nav} main={kids} sideWidth={300} />
      ) : (
        <View style={{ gap: space.md }}>
          {kids}
          <SectionTitle>Manage</SectionTitle>
          {nav}
        </View>
      )}
    </Screen>
  );
}

function Stat({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xxs }}>
      <Icon name={icon} size={20} color={colors.hero} />
      <Txt variant="caption" color={colors.inkSoft}>
        {label}
      </Txt>
      <Txt variant="label">{value}</Txt>
    </View>
  );
}
