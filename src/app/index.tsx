import { Redirect } from 'expo-router';

import { useAppState } from '@/state/AppStateProvider';

/** Entry point: new users start onboarding, returning users go straight home. */
export default function Index() {
  const { isOnboarded } = useAppState();
  return <Redirect href={isOnboarded ? '/home' : '/welcome'} />;
}
