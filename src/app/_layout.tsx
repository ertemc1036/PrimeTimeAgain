import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ReminderSync } from '@/components/system/ReminderSync';
import { ErrorState } from '@/components/ui';
import { hydrateLanguage } from '@/i18n';
import { AppStateProvider, useAppState } from '@/state/AppStateProvider';
import { lightColors } from '@/theme';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [languageReady, setLanguageReady] = useState(false);

  useEffect(() => {
    hydrateLanguage().finally(() => setLanguageReady(true));
  }, []);

  return (
    <GestureHandlerRootView style={StyleSheet.absoluteFill}>
      <AppStateProvider>
        <RootNavigator ready={languageReady} />
      </AppStateProvider>
    </GestureHandlerRootView>
  );
}

const modal = { presentation: 'modal' } as const;

function RootNavigator({ ready }: { ready: boolean }) {
  const { status, isOnboarded, retryLoad } = useAppState();
  const visible = ready && status !== 'loading';

  useEffect(() => {
    if (visible) void SplashScreen.hideAsync();
  }, [visible]);

  if (!visible) return null; // the native splash screen stays up
  if (status === 'error') return <ErrorState onRetry={retryLoad} />;

  return (
    <>
      <StatusBar style="auto" />
      {isOnboarded ? <ReminderSync /> : null}
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: lightColors.background } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="language" options={modal} />
        <Stack.Protected guard={!isOnboarded}>
          <Stack.Screen name="(onboarding)" />
        </Stack.Protected>
        <Stack.Protected guard={isOnboarded}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="area/[id]" />
          <Stack.Screen name="goal/[id]" />
          <Stack.Screen name="goal-edit/[id]" options={modal} />
          <Stack.Screen name="mission/[id]" options={modal} />
          <Stack.Screen name="add-mission" options={modal} />
          <Stack.Screen name="day-summary" options={modal} />
          <Stack.Screen name="calendar" />
          <Stack.Screen name="coach" />
          <Stack.Screen name="avatar-studio" />
          <Stack.Screen name="goals" />
          <Stack.Screen name="plan" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="edit-name" options={modal} />
          <Stack.Screen name="reflection" options={modal} />
          <Stack.Screen name="measurement" options={modal} />
          <Stack.Screen name="pro" />
        </Stack.Protected>
      </Stack>
    </>
  );
}
