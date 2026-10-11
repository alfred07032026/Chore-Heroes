import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { ChildForm } from '@/components/ChildForm';
import { Screen } from '@/components/Screen';
import { TopBar } from '@/components/TopBar';
import { Txt } from '@/components/Txt';
import { useQuery } from '@/hooks/useQuery';
import { createChild, getChild, updateChild } from '@/services/children';
import { mutate } from '@/state/appStore';
import { colors } from '@/theme/tokens';

export default function ChildEdit() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const q = useQuery((db) => (id ? getChild(db, id) : Promise.resolve(null)), [id]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (id && !q.data) return <Screen>{null}</Screen>;
  return (
    <Screen
      header={<TopBar title={id ? 'Edit child' : 'Add child'} onBack={() => router.back()} />}
      maxWidth={720}
    >
      {error ? (
        <Txt variant="body" color={colors.danger}>
          {error}
        </Txt>
      ) : null}
      <ChildForm
        initial={q.data ?? undefined}
        busy={busy}
        submitLabel={id ? 'Save' : 'Add child'}
        onCancel={() => router.back()}
        onSubmit={async (input) => {
          setBusy(true);
          try {
            await mutate(async (db) => {
              if (id) await updateChild(db, id, input);
              else await createChild(db, input);
            });
            router.back();
          } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
          } finally {
            setBusy(false);
          }
        }}
      />
    </Screen>
  );
}
