// Initialises translations before any screen renders.
import { hydrateLanguage } from '@/i18n';

import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { Inter_800ExtraBold } from '@expo-google-fonts/inter/800ExtraBold';
import { useFonts } from 'expo-font';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ErrorState, ToastProvider } from '@/components/ui';
import { ReminderSync } from '@/features/ReminderSync';
import { AppStateProvider, useAppState } from '@/state/AppStateProvider';
import { AuthProvider } from '@/state/AuthProvider';
import { ProProvider } from '@/state/ProProvider';
import { SyncProvider, useSync } from '@/state/SyncProvider';
import { colors } from '@/theme';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold });
  const [languageReady, setLanguageReady] = useState(false);
  useEffect(() => {
    void hydrateLanguage().finally(() => setLanguageReady(true));
  }, []);
  return (
    <GestureHandlerRootView style={styles.root}>
      <AppStateProvider>
        <AuthProvider>
          <SyncProvider>
            <ProProvider>
              <ToastProvider>
                <RootNavigator ready={(fontsLoaded || !!fontError) && languageReady} />
              </ToastProvider>
            </ProProvider>
          </SyncProvider>
        </AuthProvider>
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

  if (!visible) return null; // the native splash screen stays visible
  if (status === 'error') return <ErrorState onRetry={retryLoad} />;

  return (
    <>
      <StatusBar style="dark" />
      {isOnboarded ? <ReminderSync /> : null}
      <SyncDecisionGate />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="language" options={modal} />
        <Stack.Screen name="auth" options={modal} />
        {/* Isolated 3D check for real devices; reachable before and after onboarding. */}
        <Stack.Screen name="3d-test" />
        <Stack.Protected guard={!isOnboarded}>
          <Stack.Screen name="(onboarding)" />
        </Stack.Protected>
        <Stack.Protected guard={isOnboarded}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="plan-meal" options={modal} />
          <Stack.Screen name="food-entry" options={modal} />
          <Stack.Screen name="custom-food" options={modal} />
          <Stack.Screen name="food-scan" options={modal} />
          <Stack.Screen name="workout-log" options={modal} />
          <Stack.Screen name="workout-photo" options={modal} />
          <Stack.Screen name="weight" options={modal} />
          <Stack.Screen name="avatar-body" options={modal} />
          <Stack.Screen name="photos" />
          <Stack.Screen name="history" />
          <Stack.Screen name="coach" />
          <Stack.Screen name="pro" options={modal} />
          <Stack.Screen name="settings" />
        </Stack.Protected>
      </Stack>
    </>
  );
}

/** Opens the merge/replace choice when a signed-in account meets existing data on this device. */
function SyncDecisionGate() {
  const { decision } = useSync();
  useEffect(() => {
    if (decision) router.push('/auth/merge');
  }, [decision]);
  return null;
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.background } });
