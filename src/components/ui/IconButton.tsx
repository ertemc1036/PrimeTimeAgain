import { StyleSheet } from 'react-native';

import { colors, layout, radii, shadows } from '@/theme';

import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';

export function IconButton({
  icon,
  label,
  onPress,
  tint = colors.surface,
}: {
  icon: IconName;
  /** Required: announced by screen readers. */
  label: string;
  onPress: () => void;
  tint?: string;
}) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={[styles.button, { backgroundColor: tint }, shadows.soft]}>
      <Icon name={icon} size={20} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
