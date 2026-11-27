import { useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback } from 'react';

import { OnboardingFlow } from '@/features/onboarding/flow/Flow';

/** The whole onboarding (welcome → questions → personal plan → account) runs on this route. */
export default function Welcome() {
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('dark');
    }, []),
  );
  return <OnboardingFlow />;
}
