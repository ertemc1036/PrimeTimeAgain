import { StyleSheet } from 'react-native';

import { colors, layout, radii } from '@/theme';

import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';

export function IconButton({
  icon,
  label,
  onPress,
  variant = 'filled',
  color,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  variant?: 'filled' | 'plain' | 'inverse';
  color?: string;
}) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={[styles.button, variant === 'filled' && { backgroundColor: colors.card }, variant === 'inverse' && { backgroundColor: colors.black }]}>
      <Icon name={icon} size={21} color={color ?? (variant === 'inverse' ? colors.white : colors.text)} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: { width: layout.minTouchTarget - 4, height: layout.minTouchTarget - 4, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
});
