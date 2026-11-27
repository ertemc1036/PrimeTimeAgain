import { Stack } from 'expo-router';

import { OnboardingStateProvider } from '@/features/onboarding/flow/state';
import { onboarding } from '@/theme';

export default function OnboardingLayout() {
  return (
    <OnboardingStateProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: onboarding.background } }} />
    </OnboardingStateProvider>
  );
}
