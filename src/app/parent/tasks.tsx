import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card, SectionTitle } from '@/components/Card';
import { ToggleRow } from '@/components/Form';
import { Icon } from '@/components/Icon';
import { EmptyState } from '@/components/Misc';
import { ListRow } from '@/components/parent/ListRow';
import { TaskEditor } from '@/components/parent/TaskEditor';
import { Screen } from '@/components/Screen';
import { StarPill } from '@/components/Stars';
import { TopBar } from '@/components/TopBar';
import { Txt } from '@/components/Txt';
import { describeSchedule } from '@/domain/recurrence';
import { useLayout } from '@/hooks/useLayout';
import { useQuery } from '@/hooks/useQuery';
import { listChildren } from '@/services/children';
import { listTasks } from '@/services/tasks';
import { colors, space } from '@/theme/tokens';

export default function Tasks() {
  const { twoPane } = useLayout();
  const [showArchived, setShowArchived] = useState(false);
  const [selected, setSelected] = useState<string | 'new' | null>(null);
  const q = useQuery(
    async (db) => ({ tasks: await listTasks(db, true), kids: await listChildren(db, true) }),
    [],
  );
  const tasks = (q.data?.tasks ?? []).filter((t) => showArchived || !t.archivedAt);
  const kidById = new Map((q.data?.kids ?? []).map((k) => [k.id, k]));

  const open = (id: string | 'new') => {
    if (twoPane) setSelected(id);
    else
      router.push(
        id === 'new' ? '/parent/task-edit' : { pathname: '/parent/task-edit', params: { id } },
      );
  };

  const list = (
    <View style={{ gap: space.sm }}>
      <ToggleRow
        label="Show archived jobs"
        value={showArchived}
        onChange={setShowArchived}
        icon="archive"
      />
      {tasks.length === 0 && !q.loading ? (
        <EmptyState title="No jobs yet" body="Add a job or start from one of the 20+ templates." />
      ) : null}
      {tasks.map((t) => (
        <ListRow
          key={t.id}
          testID={`task-row-${t.title}`}
          icon={t.icon}
          title={t.title}
          muted={!!t.archivedAt}
          selected={selected === t.id}
          subtitle={`${describeSchedule({ type: t.scheduleType, weekdays: t.weekdays, startDate: t.startDate })}${
            t.needsApproval ? ' · needs approval' : ''
          }${t.archivedAt ? ' · archived' : ''}`}
          onPress={() => open(t.id)}
          right={
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <StarPill value={t.stars} />
              <View style={{ flexDirection: 'row', gap: 2 }}>
                {t.childIds.slice(0, 6).map((id) => {
                  const k = kidById.get(id);
                  return k ? <Avatar key={id} avatar={k.avatar} color={k.color} size={26} /> : null;
                })}
                {t.needsApproval ? (
                  <Icon name="account-check" size={22} color={colors.hero} />
                ) : null}
              </View>
            </View>
          }
        />
      ))}
    </View>
  );

  return (
    <Screen
      header={
        <TopBar
          title="Jobs"
          onBack={() => router.back()}
          right={
            <Button label="New job" icon="plus" onPress={() => open('new')} testID="task-new" />
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
                  <SectionTitle>{selected === 'new' ? 'New job' : 'Edit job'}</SectionTitle>
                  <TaskEditor
                    key={selected}
                    taskId={selected === 'new' ? null : selected}
                    onDone={() => setSelected(null)}
                  />
                </>
              ) : (
                <View style={{ alignItems: 'center', padding: space.xl, gap: space.sm }}>
                  <Icon name="gesture-tap" size={48} color={colors.hero} />
                  <Txt variant="body" center color={colors.inkSoft}>
                    Pick a job to edit, or add a new one.
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
