import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { ChildForm } from '@/components/ChildForm';
import { ErrorText } from '@/components/ErrorText';
import { LoadingScreen } from '@/components/Loading';
import { Screen } from '@/components/Screen';
import { TopBar } from '@/components/TopBar';
import { useQuery } from '@/hooks/useQuery';
import { createChild, getChild, updateChild } from '@/services/children';
import { mutate, useAppStore } from '@/state/appStore';

export default function ChildEdit() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const q = useQuery((db) => (id ? getChild(db, id) : Promise.resolve(null)), [id]);
  const [error, setError] = useState<string | null>(null);
  if (id && !q.data) return <LoadingScreen />;
  return (
    <Screen
      header={<TopBar title={id ? 'Edit child' : 'Add child'} onBack={() => router.back()} />}
      maxWidth={720}
    >
      <ErrorText>{error}</ErrorText>
      <ChildForm
        initial={q.data ?? undefined}
        submitLabel={id ? 'Save' : 'Add child'}
        onCancel={() => router.back()}
        onSubmit={async (input) => {
          setError(null);
          try {
            await mutate(async (db) => {
              if (id) await updateChild(db, id, input);
              else await createChild(db, input);
            });
            useAppStore.getState().showFlash(id ? `${input.name} saved` : `${input.name} added`);
            router.back();
          } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
          }
        }}
      />
    </Screen>
  );
}
