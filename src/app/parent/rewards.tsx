import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/Button';
import { Card, SectionTitle } from '@/components/Card';
import { ToggleRow } from '@/components/Form';
import { Icon } from '@/components/Icon';
import { EmptyState } from '@/components/Misc';
import { ListRow } from '@/components/parent/ListRow';
import { RewardEditor } from '@/components/parent/RewardEditor';
import { Screen } from '@/components/Screen';
import { StarPill } from '@/components/Stars';
import { TopBar } from '@/components/TopBar';
import { Txt } from '@/components/Txt';
import { useLayout } from '@/hooks/useLayout';
import { useQuery } from '@/hooks/useQuery';
import { listRewards } from '@/services/rewards';
import { colors, space } from '@/theme/tokens';

export default function Rewards() {
  const { twoPane } = useLayout();
  const [showArchived, setShowArchived] = useState(false);
  const [selected, setSelected] = useState<string | 'new' | null>(null);
  const q = useQuery((db) => listRewards(db, true), []);
  const rewards = (q.data ?? []).filter((r) => showArchived || !r.archivedAt);

  const open = (id: string | 'new') => {
    if (twoPane) setSelected(id);
    else
      router.push(
        id === 'new' ? '/parent/reward-edit' : { pathname: '/parent/reward-edit', params: { id } },
      );
  };

  const list = (
    <View style={{ gap: space.sm }}>
      <ToggleRow
        label="Show archived rewards"
        value={showArchived}
        onChange={setShowArchived}
        icon="archive"
      />
      {rewards.length === 0 && !q.loading ? (
        <EmptyState title="No rewards yet" body="Add a reward or pick a template." />
      ) : null}
      {rewards.map((r) => (
        <ListRow
          key={r.id}
          testID={`reward-row-${r.title}`}
          icon={r.icon}
          iconColor={colors.starDeep}
          iconBg={colors.starLight}
          title={r.title}
          muted={!!r.archivedAt}
          selected={selected === r.id}
          subtitle={[
            r.weeklyLimit ? `${r.weeklyLimit}× per week` : 'No weekly limit',
            r.needsApproval ? 'needs approval' : 'instant',
            r.archivedAt ? 'archived' : null,
          ]
            .filter(Boolean)
            .join(' · ')}
          accessibilityLabel={[
            r.title,
            `costs ${r.cost} ${r.cost === 1 ? 'star' : 'stars'}`,
            r.weeklyLimit ? `${r.weeklyLimit} per week` : 'no weekly limit',
            r.needsApproval ? 'needs approval' : 'instant',
            r.archivedAt ? 'archived' : null,
          ]
            .filter(Boolean)
            .join('. ')}
          onPress={() => open(r.id)}
          right={<StarPill value={r.cost} />}
        />
      ))}
    </View>
  );

  return (
    <Screen
      header={
        <TopBar
          title="Rewards"
          onBack={() => router.back()}
          right={
            <Button
              label="New reward"
              icon="plus"
              onPress={() => open('new')}
              testID="reward-new"
            />
          }
        />
      }
    >
      {twoPane ? (
        <View style={{ flexDirection: 'row', gap: space.lg, alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>{list}</View>
          <View style={{ flex: 1.1 }}>
            <Card>
              {selected ? (
                <>
                  <SectionTitle>{selected === 'new' ? 'New reward' : 'Edit reward'}</SectionTitle>
                  <RewardEditor
                    key={selected}
                    rewardId={selected === 'new' ? null : selected}
                    onDone={() => setSelected(null)}
                  />
                </>
              ) : (
                <View style={{ alignItems: 'center', padding: space.xl, gap: space.sm }}>
                  <Icon name="gesture-tap" size={48} color={colors.hero} />
                  <Txt variant="body" center color={colors.inkSoft}>
                    Pick a reward to edit, or add a new one.
                  </Txt>
                </View>
              )}
            </Card>
          </View>
        </View>
      ) : (
        list
      )}
    </Screen>
  );
}
