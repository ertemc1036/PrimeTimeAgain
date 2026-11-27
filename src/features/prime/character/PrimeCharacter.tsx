import { useEffect } from 'react';
import { Image, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, FadeIn, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { colors, radii } from '@/theme';

import { PRIME_POSES, type PrimeVariant } from './assets';

export interface PrimeCharacterProps {
  variant: PrimeVariant;
  /** Edge length in px (the artwork is square). */
  size: number;
  /**
   * 'none' = static; 'enter' = soft fade-in; 'idle' = fade-in plus a slow, small float.
   * All motion is skipped when the system asks for reduced motion.
   */
  motion?: 'none' | 'enter' | 'idle';
  /** Corner radius of the dark backdrop (images without transparency sit on Prime's studio black). */
  radius?: number;
  style?: StyleProp<ViewStyle>;
  /** Spoken description; omit for decorative use next to text that already says it. */
  accessibilityLabel?: string;
}

/** Prime as a full character in one of his poses (see ./assets.ts). */
export function PrimeCharacter({ variant, size, motion = 'enter', radius = radii.xl, style, accessibilityLabel }: PrimeCharacterProps) {
  const pose = PRIME_POSES[variant];
  const reduced = useReducedMotion();
  const y = useSharedValue(0);

  useEffect(() => {
    if (motion === 'idle' && !reduced) y.set(withRepeat(withTiming(-4, { duration: 2200, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [motion, reduced, y]);

  const float = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));

  return (
    <Animated.View
      entering={motion !== 'none' && !reduced ? FadeIn.duration(450) : undefined}
      style={[{ width: size, height: size, borderRadius: radius }, !pose.transparent && styles.backdrop, style]}
      accessible={!!accessibilityLabel}
      accessibilityRole={accessibilityLabel ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel}
      aria-hidden={!accessibilityLabel}>
      <Animated.View style={[StyleSheet.absoluteFill, float]}>
        <Image source={pose.source} style={styles.image} resizeMode="contain" />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: colors.primeBackdrop, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
});
