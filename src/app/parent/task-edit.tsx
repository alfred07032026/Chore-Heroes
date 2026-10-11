import { router, useLocalSearchParams } from 'expo-router';

import { TaskEditor } from '@/components/parent/TaskEditor';
import { Screen } from '@/components/Screen';
import { TopBar } from '@/components/TopBar';

export default function TaskEdit() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return (
    <Screen
      header={<TopBar title={id ? 'Edit job' : 'New job'} onBack={() => router.back()} />}
      maxWidth={760}
    >
      <TaskEditor taskId={id ?? null} onDone={() => router.back()} />
    </Screen>
  );
}
