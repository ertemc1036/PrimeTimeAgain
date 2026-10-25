import { Redirect } from 'expo-router';

import { useAppState } from '@/state/AppStateProvider';

export default function Index() {
  const { isOnboarded } = useAppState();
  return <Redirect href={isOnboarded ? '/today' : '/welcome'} />;
}
