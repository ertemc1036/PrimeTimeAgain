import { Fraunces_400Regular } from '@expo-google-fonts/fraunces/400Regular';
import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces/600SemiBold';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import { ErrorState } from '@/components/ui';
import { hydrateLanguage } from '@/i18n';
import { AppStateProvider, useAppState } from '@/state/AppStateProvider';
import { colors } from '@/theme';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Fraunces_400Regular, Fraunces_600SemiBold });
  const [languageReady, setLanguageReady] = useState(false);

  useEffect(() => {
    hydrateLanguage().finally(() => setLanguageReady(true));
  }, []);

  return (
    <AppStateProvider>
      <StatusBar style="dark" />
      <RootNavigator ready={(fontsLoaded || !!fontError) && languageReady} />
    </AppStateProvider>
  );
}

function RootNavigator({ ready }: { ready: boolean }) {
  const { status, isOnboarded, retryLoad } = useAppState();
  const visible = ready && status !== 'loading';

  useEffect(() => {
    if (visible) void SplashScreen.hideAsync();
  }, [visible]);

  if (!visible) return null; // the native splash screen stays up
  if (status === 'error') return <ErrorState onRetry={retryLoad} />;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="index" />
      <Stack.Protected guard={!isOnboarded}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>
      <Stack.Protected guard={isOnboarded}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="edit-profile" />
        <Stack.Screen name="goals" />
        <Stack.Screen name="language" options={{ presentation: 'modal' }} />
        <Stack.Screen name="reflection" options={{ presentation: 'modal' }} />
        <Stack.Screen name="prime-score" options={{ presentation: 'modal' }} />
      </Stack.Protected>
    </Stack>
  );
}
