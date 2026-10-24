import { Stack } from 'expo-router';

import { OnboardingDraftProvider } from '@/components/onboarding/OnboardingDraft';
import { lightColors } from '@/theme';

export default function OnboardingLayout() {
  return (
    <OnboardingDraftProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: lightColors.background } }}>
        <Stack.Screen name="welcome" />
        <Stack.Screen name="how" />
        <Stack.Screen name="define" />
        <Stack.Screen name="remember" />
        <Stack.Screen name="starting-point" />
        <Stack.Screen name="duration" />
        <Stack.Screen name="time" />
        <Stack.Screen name="create-avatar" />
        <Stack.Screen name="ready" />
      </Stack>
    </OnboardingDraftProvider>
  );
}
