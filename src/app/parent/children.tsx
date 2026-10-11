import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { SectionTitle } from '@/components/Card';
import { ListRow } from '@/components/parent/ListRow';
import { Screen } from '@/components/Screen';
import { Toast } from '@/components/Toast';
import { TopBar } from '@/components/TopBar';
import { Txt } from '@/components/Txt';
import { MAX_CHILDREN } from '@/domain/validation';
import { useQuery } from '@/hooks/useQuery';
import { archiveChild, listChildren, restoreChild } from '@/services/children';
import { mutate } from '@/state/appStore';
import { colors, space } from '@/theme/tokens';

export default function Children() {
  const q = useQuery((db) => listChildren(db, true), []);
  const [toast, setToast] = useState<string | null>(null);
  const all = q.data ?? [];
  const active = all.filter((c) => !c.archivedAt);
  const archived = all.filter((c) => c.archivedAt);

  const run = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (e) {
      setToast(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Screen
        maxWidth={820}
        header={
          <TopBar
            title="Children"
            subtitle={`${active.length} of ${MAX_CHILDREN} profiles`}
            onBack={() => router.back()}
            right={
              active.length < MAX_CHILDREN ? (
                <Button
                  label="Add child"
                  icon="plus"
                  onPress={() => router.push('/parent/child-edit')}
                  testID="child-new"
                />
              ) : undefined
            }
          />
        }
      >
        <View style={{ gap: space.sm }}>
          {active.map((c) => (
            <ListRow
              key={c.id}
              leading={<Avatar avatar={c.avatar} color={c.color} size={56} />}
              title={c.name}
              subtitle={`Age ${c.age}`}
              onPress={() => router.push({ pathname: '/parent/child-edit', params: { id: c.id } })}
              right={
                <Button
                  label="Archive"
                  tone="ghost"
                  size="compact"
                  icon="archive"
                  onPress={() => void run(() => mutate((db) => archiveChild(db, c.id)))}
                />
              }
            />
          ))}
        </View>
        {archived.length ? (
          <>
            <SectionTitle>Archived</SectionTitle>
            <Txt variant="caption" color={colors.inkSoft} style={{ marginBottom: space.sm }}>
              Archived profiles are hidden from the kids&apos; screen. Their stars and history are
              kept.
            </Txt>
            <View style={{ gap: space.sm }}>
              {archived.map((c) => (
                <ListRow
                  key={c.id}
                  muted
                  leading={<Avatar avatar={c.avatar} color={colors.locked} size={56} />}
                  title={c.name}
                  subtitle="Archived"
                  right={
                    <Button
                      label="Restore"
                      tone="secondary"
                      size="compact"
                      icon="archive-arrow-up"
                      onPress={() => void run(() => mutate((db) => restoreChild(db, c.id)))}
                    />
                  }
                />
              ))}
            </View>
          </>
        ) : null}
      </Screen>
      <Toast message={toast} icon="alert-circle" onHide={() => setToast(null)} />
    </View>
  );
}
