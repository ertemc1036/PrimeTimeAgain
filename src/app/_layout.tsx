import '@/i18n';

import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { Inter_800ExtraBold } from '@expo-google-fonts/inter/800ExtraBold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ErrorState, ToastProvider } from '@/components/ui';
import { ReminderSync } from '@/features/ReminderSync';
import { AppStateProvider, useAppState } from '@/state/AppStateProvider';
import { ProProvider } from '@/state/ProProvider';
import { colors } from '@/theme';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold });
  return (
    <GestureHandlerRootView style={styles.root}>
      <AppStateProvider>
        <ProProvider>
          <ToastProvider>
            <RootNavigator ready={fontsLoaded || !!fontError} />
          </ToastProvider>
        </ProProvider>
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
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="index" />
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

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.background } });
