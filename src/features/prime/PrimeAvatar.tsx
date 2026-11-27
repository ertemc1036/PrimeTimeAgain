import { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { colors } from '@/theme';

import { PRIME_FACE } from './character/assets';

export interface PrimeAvatarProps {
  size?: number;
  /** Optional ring around the circle (e.g. white on the tab bar). */
  ring?: string;
  /** Play a short "hello" pop whenever this turns true (e.g. the Prime tab gets focus). */
  active?: boolean;
  /** Gentle breathing while Prime is thinking. */
  busy?: boolean;
}

/** Prime's face in a black circle (tab bar, chat, small cards). The full character is PrimeCharacter. */
export function PrimeAvatar({ size = 44, ring, active, busy }: PrimeAvatarProps) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const glow = useSharedValue(0);

  useEffect(() => {
    if (!active || reduced) return;
    scale.set(withSequence(withTiming(0.92, { duration: 90 }), withSpring(1, { damping: 10, stiffness: 220 })));
  }, [active, reduced, scale]);

  useEffect(() => {
    if (busy && !reduced) glow.set(withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true));
    else {
      cancelAnimation(glow);
      glow.set(withTiming(0, { duration: 200 }));
    }
  }, [busy, reduced, glow]);

  const pop = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  const halo = useAnimatedStyle(() => ({ opacity: glow.get() * 0.5, transform: [{ scale: 1 + glow.get() * 0.12 }] }));
  const r = size / 2;

  return (
    <Animated.View style={[{ width: size, height: size }, pop]} accessible accessibilityRole="image" accessibilityLabel="Prime">
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: r, backgroundColor: colors.gray }, halo]} />
      <View style={[styles.circle, { borderRadius: r, borderWidth: ring ? Math.max(2, Math.round(size / 22)) : 0, borderColor: ring }]}>
        <Image source={PRIME_FACE} style={styles.face} resizeMode="cover" />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  circle: { flex: 1, backgroundColor: colors.black, overflow: 'hidden' },
  face: { width: '100%', height: '100%' },
});
