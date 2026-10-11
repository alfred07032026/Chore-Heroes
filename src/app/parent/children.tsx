import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { SectionTitle } from '@/components/Card';
import { Sheet } from '@/components/Sheet';
import { ListRow } from '@/components/parent/ListRow';
import { Screen } from '@/components/Screen';
import { Toast } from '@/components/Toast';
import { TopBar } from '@/components/TopBar';
import { Txt } from '@/components/Txt';
import { MAX_CHILDREN } from '@/domain/validation';
import { useQuery } from '@/hooks/useQuery';
import { archiveChild, listChildren, restoreChild } from '@/services/children';
import { mutate, useAppStore } from '@/state/appStore';
import type { Child } from '@/domain/types';
import { colors, space } from '@/theme/tokens';

export default function Children() {
  const q = useQuery((db) => listChildren(db, true), []);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<Child | null>(null);
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
                  onPress={() => setConfirmArchive(c)}
                  accessibilityLabel={`Archive ${c.name}`}
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
                      onPress={() =>
                        void run(async () => {
                          await mutate((db) => restoreChild(db, c.id));
                          useAppStore.getState().showFlash(`${c.name} restored`);
                        })
                      }
                      accessibilityLabel={`Restore ${c.name}`}
                    />
                  }
                />
              ))}
            </View>
          </>
        ) : null}
      </Screen>
      <Toast message={toast} icon="alert-circle" onHide={() => setToast(null)} />
      <Sheet visible={!!confirmArchive} onClose={() => setConfirmArchive(null)} width={480}>
        {confirmArchive ? (
          <View style={{ gap: space.md }}>
            <Txt variant="title" accessibilityRole="header">
              Archive {confirmArchive.name}?
            </Txt>
            <Txt variant="body">
              {confirmArchive.name} will disappear from the kids&apos; screen and won&apos;t get new
              jobs. Stars, badges and history are kept, and you can restore the profile any time.
            </Txt>
            <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' }}>
              <Button label="Cancel" tone="secondary" onPress={() => setConfirmArchive(null)} />
              <Button
                label="Archive"
                icon="archive"
                tone="danger"
                testID="confirm-archive-child"
                onPress={() => {
                  const c = confirmArchive;
                  setConfirmArchive(null);
                  void run(async () => {
                    await mutate((db) => archiveChild(db, c.id));
                    useAppStore.getState().showFlash(`${c.name} archived`);
                  });
                }}
              />
            </View>
          </View>
        ) : null}
      </Sheet>
    </View>
  );
}
