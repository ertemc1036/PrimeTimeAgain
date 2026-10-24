import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';

import { AppText } from '@/components/ui';
import { radii, spacing, useColors } from '@/theme';

/** Brief encouraging message after completing a mission. Announced to screen readers. */
export function Toast({ message, onHide }: { message: string; onHide: () => void }) {
  const colors = useColors();
  useEffect(() => {
    const id = setTimeout(onHide, 2200);
    return () => clearTimeout(id);
  }, [message, onHide]);
  return (
    <Animated.View
      entering={FadeInUp.springify().damping(16)}
      exiting={FadeOutUp}
      style={[styles.toast, { backgroundColor: colors.accent }]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      pointerEvents="none">
      <AppText variant="label" color={colors.onAccent} align="center">
        {message}
      </AppText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: { position: 'absolute', top: spacing.sm, alignSelf: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radii.pill, zIndex: 10 },
});
