import { Redirect, router } from 'expo-router';
import { View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { IconButton } from '@/components/Button';
import { Grid, useGridColumns } from '@/components/Misc';
import { Mascot } from '@/components/Mascot';
import { Pressy } from '@/components/Pressy';
import { Screen } from '@/components/Screen';
import { StarPill } from '@/components/Stars';
import { Txt } from '@/components/Txt';
import { useQuery } from '@/hooks/useQuery';
import { feedback } from '@/platform/feedback';
import { speak } from '@/platform/speech';
import { listChildren } from '@/services/children';
import { getBalances } from '@/services/ledger';
import { useAppStore } from '@/state/appStore';
import { colors, radius, shadow, space, touch } from '@/theme/tokens';

/** Child home: "Who's playing?" — giant avatars, no reading needed. */
export default function Kids() {
  const setupComplete = useAppStore((s) => s.setupComplete);
  const q = useQuery(
    async (db) => ({ kids: await listChildren(db), balances: await getBalances(db) }),
    [],
  );
  const columns = useGridColumns(240, 3);
  if (!setupComplete) return <Redirect href="/setup" />;
  const kids = q.data?.kids ?? [];

  return (
    <Screen
      header={
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: space.sm,
          }}
        >
          <IconButton
            icon="volume-high"
            label="Hear it: who is playing?"
            tone="star"
            size={touch.child}
            onPress={() => speak("Who's playing? Tap your hero!")}
          />
          <IconButton
            icon="lock"
            label="Grown-ups area"
            onPress={() => router.push('/parent-unlock')}
            testID="parent-button"
          />
        </View>
      }
    >
      <View style={{ alignItems: 'center', gap: space.sm, marginBottom: space.lg }}>
        <Mascot size={130} />
        <Txt variant="display" center accessibilityRole="header">
          Who&apos;s playing?
        </Txt>
      </View>
      <Grid columns={Math.min(columns, Math.max(1, kids.length))}>
        {kids.map((k) => (
          <Pressy
            key={k.id}
            testID={`kid-${k.name}`}
            accessibilityLabel={`${k.name}. ${q.data?.balances[k.id] ?? 0} stars`}
            onPress={() => {
              feedback({ sound: 'tap', haptic: 'tap', say: `Hi ${k.name}!` });
              router.push({ pathname: '/kid/[childId]', params: { childId: k.id } });
            }}
            style={[
              {
                backgroundColor: colors.surface,
                borderRadius: radius.xl,
                padding: space.lg,
                alignItems: 'center',
                gap: space.sm,
                borderBottomWidth: 8,
                borderBottomColor: k.color,
                minHeight: 260,
                justifyContent: 'center',
              },
              shadow.card,
            ]}
          >
            <Avatar avatar={k.avatar} color={k.color} size={150} />
            <Txt variant="title" center>
              {k.name}
            </Txt>
            <StarPill value={q.data?.balances[k.id] ?? 0} center big />
          </Pressy>
        ))}
      </Grid>
    </Screen>
  );
}
