import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect } from 'react';
import { Image, type ImageSourcePropType, StyleSheet, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { colors } from '@/theme';

/**
 * Prime's look. Placeholder until the final mascot exists: a black circle with a simple white symbol.
 *
 * To use your own mascot, set PRIME_ARTWORK to an image, e.g. `require('../../../assets/images/prime.png')`
 * (square PNG with transparency, at least 3× the largest size used: 3 × 88 px). Every screen follows.
 * An animated mascot (Lottie/Rive) would replace the <Image> below; the props stay the same.
 */
const PRIME_ARTWORK: ImageSourcePropType | null = null;

export interface PrimeAvatarProps {
  size?: number;
  /** Optional ring colour around the circle (e.g. baby blue when selected). */
  ring?: string;
  /** Play a short "hello" pop whenever this turns true (e.g. the Prime tab gets focus). */
  active?: boolean;
  /** Gentle breathing while Prime is thinking. */
  busy?: boolean;
}

export function PrimeAvatar({ size = 44, ring, active, busy }: PrimeAvatarProps) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const glow = useSharedValue(0);

  useEffect(() => {
    if (!active || reduced) return;
    scale.set(withSequence(withTiming(0.9, { duration: 90 }), withSpring(1, { damping: 9, stiffness: 220 })));
  }, [active, reduced, scale]);

  useEffect(() => {
    if (busy && !reduced) glow.set(withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true));
    else {
      cancelAnimation(glow);
      glow.set(withTiming(0, { duration: 200 }));
    }
  }, [busy, reduced, glow]);

  const pop = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  const halo = useAnimatedStyle(() => ({ opacity: glow.get() * 0.6, transform: [{ scale: 1 + glow.get() * 0.12 }] }));
  const r = size / 2;

  return (
    <Animated.View style={[{ width: size, height: size }, pop]} accessible accessibilityRole="image" accessibilityLabel="Prime">
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: r, backgroundColor: colors.primary }, halo]} />
      <View style={[styles.circle, { borderRadius: r, borderWidth: ring ? Math.max(2, Math.round(size / 20)) : 0, borderColor: ring }]}>
        {PRIME_ARTWORK ? <Image source={PRIME_ARTWORK} style={{ width: size, height: size }} resizeMode="cover" /> : <Ionicons name="sparkles" size={Math.round(size * 0.42)} color={colors.white} />}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  circle: { flex: 1, backgroundColor: colors.black, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
