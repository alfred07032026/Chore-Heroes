import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Form';
import { IconBubble } from '@/components/Icon';
import { EmptyState, Grid, useGridColumns } from '@/components/Misc';
import { Screen } from '@/components/Screen';
import { StarPill } from '@/components/Stars';
import { Toast } from '@/components/Toast';
import { TopBar } from '@/components/TopBar';
import { Txt } from '@/components/Txt';
import { NICE_JOB_NOTES } from '@/domain/types';
import { useQuery } from '@/hooks/useQuery';
import { approveTask, getInbox, rejectTask, type InboxItem } from '@/services/approvals';
import { approveRedemption, rejectRedemption } from '@/services/rewards';
import { mutate } from '@/state/appStore';
import { colors, space } from '@/theme/tokens';

function when(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' });
}

function InboxCard({ item, onToast }: { item: InboxItem; onToast: (m: string) => void }) {
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isTask = item.kind === 'task';
  const title = isTask ? item.instance.title : item.redemption.title;
  const icon = isTask ? item.instance.icon : item.redemption.icon;
  const id = isTask ? item.instance.id : item.redemption.id;

  const decide = async (approve: boolean) => {
    setBusy(true);
    try {
      await mutate(async (db) => {
        if (isTask) return approve ? approveTask(db, id, note) : rejectTask(db, id, note);
        return approve ? approveRedemption(db, id, note) : rejectRedemption(db, id, note);
      });
      onToast(
        approve
          ? `${isTask ? 'Approved' : 'Reward approved'}: ${title}`
          : isTask
            ? `Sent back to ${item.child.name} to try again`
            : `Declined — ${item.redemption.cost} stars refunded`,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ gap: space.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <Avatar avatar={item.child.avatar} color={item.child.color} size={48} />
        <View style={{ flex: 1 }}>
          <Txt variant="label">{item.child.name}</Txt>
          <Txt variant="caption" color={colors.inkSoft}>
            {isTask
              ? `Finished a job · ${when(item.instance.completedAt)}`
              : `Wants a reward · ${when(item.redemption.requestedAt)}`}
          </Txt>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <IconBubble
          name={icon}
          size={56}
          color={isTask ? colors.hero : colors.starDeep}
          background={isTask ? colors.heroLight : colors.starLight}
        />
        <Txt variant="heading" style={{ flex: 1 }}>
          {title}
        </Txt>
        <StarPill value={isTask ? item.instance.stars : item.redemption.cost} />
      </View>
      <Txt variant="caption" color={colors.inkSoft}>
        {isTask
          ? 'Stars are added when you approve.'
          : 'Stars were set aside when asked; declining gives them back.'}
      </Txt>
      <Txt variant="caption" weight="bold">
        Add a note for {item.child.name} (optional)
      </Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }}>
        {NICE_JOB_NOTES.map((n) => (
          <Chip
            key={n}
            label={n}
            selected={note === n}
            onPress={() => setNote(note === n ? null : n)}
            icon="heart"
          />
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
        <Button
          label={isTask ? 'Not yet' : 'Not this time'}
          tone="secondary"
          icon="undo-variant"
          onPress={() => void decide(false)}
          disabled={busy}
          testID={`reject-${title}`}
        />
        <Button
          label="Approve"
          tone="success"
          icon="check-bold"
          onPress={() => void decide(true)}
          busy={busy}
          testID={`approve-${title}`}
        />
      </View>
    </Card>
  );
}

export default function Inbox() {
  const q = useQuery((db) => getInbox(db), []);
  const columns = useGridColumns(420, 2);
  const [toast, setToast] = useState<string | null>(null);
  const items = q.data ?? [];
  return (
    <View style={{ flex: 1 }}>
      <Screen
        header={
          <TopBar
            title="Approvals"
            onBack={() => router.back()}
            subtitle="Finished jobs and reward requests"
          />
        }
      >
        {items.length === 0 && !q.loading ? (
          <EmptyState
            title="All caught up!"
            body="Jobs that need your OK and reward requests will show up here."
          />
        ) : (
          <Grid columns={columns}>
            {items.map((item) => (
              <InboxCard
                key={item.kind === 'task' ? item.instance.id : item.redemption.id}
                item={item}
                onToast={setToast}
              />
            ))}
          </Grid>
        )}
      </Screen>
      <Toast message={toast} icon="check-circle" onHide={() => setToast(null)} />
    </View>
  );
}
