import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { colors, radii } from '@/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function useProgress(progress: number, duration: number) {
  const reduced = useReducedMotion();
  const value = useSharedValue(0);
  useEffect(() => {
    const target = Math.min(Math.max(progress, 0), 1);
    value.set(reduced ? target : withTiming(target, { duration, easing: Easing.out(Easing.cubic) }));
  }, [progress, value, reduced, duration]);
  return value;
}

export function ProgressRing({
  progress,
  size = 120,
  stroke = 10,
  color = colors.black,
  track = colors.border,
  children,
}: {
  progress: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const value = useProgress(progress, 800);
  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - value.get()) }));
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <AnimatedCircle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} strokeLinecap="round" fill="none" strokeDasharray={`${c} ${c}`} animatedProps={animatedProps} />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>
    </View>
  );
}

export function ProgressBar({ progress, height = 8, track = colors.border }: { progress: number; height?: number; track?: string }) {
  const value = useProgress(progress, 600);
  const fill = useAnimatedStyle(() => ({ width: `${value.get() * 100}%` }));
  return (
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }} style={[styles.track, { height, backgroundColor: track }]}>
      <Animated.View style={[styles.fill, fill]} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  track: { width: '100%', borderRadius: radii.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radii.pill, backgroundColor: colors.black },
});
