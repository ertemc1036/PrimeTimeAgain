import { Stack } from 'expo-router';

import { OnboardingDraftProvider } from '@/features/onboarding/draft';
import { colors } from '@/theme';

export default function OnboardingLayout() {
  return (
    <OnboardingDraftProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
    </OnboardingDraftProvider>
  );
}
