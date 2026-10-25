import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radii, spacing } from '@/theme';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';

const ToastContext = createContext<(message: string, icon?: IconName) => void>(() => undefined);

/** Brief, neutral confirmations ("Workout saved"). Announced to screen readers. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<{ id: number; message: string; icon: IconName } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((message: string, icon: IconName = 'checkmark-circle') => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ id: Date.now(), message, icon });
    timer.current = setTimeout(() => setToast(null), 2600);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <View pointerEvents="none" style={[styles.host, { top: insets.top + spacing.xs }]}>
        {toast ? (
          <Animated.View key={toast.id} entering={FadeInUp.duration(250)} exiting={FadeOutUp.duration(200)} style={styles.toast} accessibilityLiveRegion="polite" accessibilityRole="alert">
            <Icon name={toast.icon} size={18} color={colors.white} />
            <AppText variant="label" color={colors.white} style={styles.text}>
              {toast.message}
            </AppText>
          </Animated.View>
        ) : null}
      </View>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 100 },
  toast: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.black, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radii.pill, maxWidth: '90%' },
  text: { flexShrink: 1 },
});
