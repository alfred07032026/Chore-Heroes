import { router, useLocalSearchParams } from 'expo-router';

import { RewardEditor } from '@/components/parent/RewardEditor';
import { Screen } from '@/components/Screen';
import { TopBar } from '@/components/TopBar';

export default function RewardEdit() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return (
    <Screen
      header={<TopBar title={id ? 'Edit reward' : 'New reward'} onBack={() => router.back()} />}
      maxWidth={760}
    >
      <RewardEditor rewardId={id ?? null} onDone={() => router.back()} />
    </Screen>
  );
}
