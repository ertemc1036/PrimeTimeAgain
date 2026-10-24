import { StyleSheet, View } from 'react-native';

import { layout, radii, useColors } from '@/theme';

import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';

export function IconButton({
  icon,
  label,
  onPress,
  badge,
  variant = 'surface',
  color,
}: {
  icon: IconName;
  /** Required: announced by screen readers. */
  label: string;
  onPress: () => void;
  badge?: boolean;
  variant?: 'surface' | 'plain';
  color?: string;
}) {
  const colors = useColors();
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={[styles.button, variant === 'surface' && { backgroundColor: colors.surface }]}>
      <Icon name={icon} size={20} color={color} />
      {badge ? <View style={[styles.badge, { backgroundColor: colors.text, borderColor: colors.background }]} /> : null}
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
  badge: { position: 'absolute', top: 10, right: 11, width: 9, height: 9, borderRadius: 5, borderWidth: 2 },
});
