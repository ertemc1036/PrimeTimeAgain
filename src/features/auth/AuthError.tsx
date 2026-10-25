import { router, useNavigation } from 'expo-router';
import { Platform } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui';
import type { AuthErrorCode } from '@/services/auth';

export function AuthError({ code }: { code: AuthErrorCode | null }) {
  const { t } = useTranslation();
  if (!code) return null;
  return (
    <AppText variant="bodyStrong" accessibilityLiveRegion="polite" accessibilityRole="alert">
      {t(`auth.errors.${code}`)}
    </AppText>
  );
}

/**
 * Leave the whole auth flow and return to where the user came from. Each auth link can open as its
 * own modal on the root stack, so every auth modal on top is closed at once.
 */
export function useCloseAuth() {
  const navigation = useNavigation();
  return () => {
    const root = navigation.getParent();
    const routes = root?.getState()?.routes ?? [];
    let count = 0;
    let entries = 0;
    for (let i = routes.length - 1; i >= 0 && routes[i].name === 'auth'; i--) {
      count++;
      entries += ((routes[i].state as { index?: number } | undefined)?.index ?? 0) + 1;
    }
    if (!root || count === 0 || count >= routes.length) return router.replace('/');
    // Web: one browser-history jump, so no intermediate auth screen is restored on the way back.
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.history.go(-entries);
    else root.dispatch({ type: 'POP', payload: { count } });
  };
}
