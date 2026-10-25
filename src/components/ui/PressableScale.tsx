import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
}

/** Pressable with a subtle press-down; disabled when the user prefers reduced motion. */
export function PressableScale({ style, scaleTo = 0.97, onPressIn, onPressOut, ...rest }: PressableScaleProps) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return (
    <AnimatedPressable
      onPressIn={(e) => {
        if (!reduced) scale.set(withSpring(scaleTo, { damping: 22, stiffness: 340 }));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.set(withSpring(1, { damping: 16, stiffness: 220 }));
        onPressOut?.(e);
      }}
      style={[style, animated]}
      {...rest}
    />
  );
}
