import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { colors, radii } from '@/theme';

export function ProgressBar({
  progress,
  color = colors.primary,
  track = colors.primarySoft,
  height = 8,
}: {
  progress: number;
  color?: string;
  track?: string;
  height?: number;
}) {
  const value = useSharedValue(0);
  useEffect(() => {
    value.set(withTiming(Math.min(Math.max(progress, 0), 1), { duration: 700, easing: Easing.out(Easing.cubic) }));
  }, [progress, value]);
  const fill = useAnimatedStyle(() => ({ width: `${value.get() * 100}%` }));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
      style={[styles.track, { backgroundColor: track, height }]}>
      <Animated.View style={[styles.fill, { backgroundColor: color }, fill]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', borderRadius: radii.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radii.pill },
});
