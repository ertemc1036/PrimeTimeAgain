import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

import { colors } from '@/theme';

import { Icon } from './Icon';

/** Status circle that animates subtly when it becomes checked (respects reduced motion). */
export function CheckCircle({ checked, size = 32 }: { checked: boolean; size?: number }) {
  const reduced = useReducedMotion();
  const pop = useSharedValue(1);
  const ring = useSharedValue(1);
  const was = useRef(checked);
  useEffect(() => {
    if (checked && !was.current && !reduced) {
      pop.set(withSequence(withSpring(1.18, { damping: 8, stiffness: 380 }), withSpring(1, { damping: 12 })));
      ring.set(withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: 520 })));
    }
    was.current = checked;
  }, [checked, reduced, pop, ring]);
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.get() }] }));
  const ringStyle = useAnimatedStyle(() => ({ opacity: 0.35 * (1 - ring.get()), transform: [{ scale: 1 + ring.get() * 0.8 }] }));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: size / 2, borderWidth: 2, borderColor: colors.black }, ringStyle]} />
      <Animated.View
        style={[
          { width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
          checked ? { backgroundColor: colors.black, borderColor: colors.black } : { borderColor: colors.disabled },
          popStyle,
        ]}>
        {checked ? <Icon name="checkmark" size={size * 0.56} color={colors.white} /> : null}
      </Animated.View>
    </View>
  );
}
