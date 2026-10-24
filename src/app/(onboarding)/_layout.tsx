import { Stack } from 'expo-router';

import { OnboardingDraftProvider } from '@/components/onboarding/OnboardingDraft';
import { colors } from '@/theme';

export default function OnboardingLayout() {
  return (
    <OnboardingDraftProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="welcome" />
        <Stack.Screen name="choose-language" />
        <Stack.Screen name="about" />
        <Stack.Screen name="focus" />
        <Stack.Screen name="rhythm" />
        <Stack.Screen name="choose-goals" />
        <Stack.Screen name="ready" />
      </Stack>
    </OnboardingDraftProvider>
  );
}
