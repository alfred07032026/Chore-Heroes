import { Redirect } from 'expo-router';

import { useAppStore } from '@/state/appStore';

export default function Index() {
  const setupComplete = useAppStore((s) => s.setupComplete);
  return <Redirect href={setupComplete ? '/kids' : '/setup'} />;
}
