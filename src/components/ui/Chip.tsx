import { StyleSheet } from 'react-native';

import { layout, radii, spacing, useColors } from '@/theme';

import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

/** Compact toggle for multi-select answers and filters. */
export function Chip({
  label,
  selected,
  onPress,
  mode = 'checkbox',
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  mode?: 'checkbox' | 'radio';
}) {
  const colors = useColors();
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.96}
      accessibilityRole={mode}
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      style={[
        styles.chip,
        { backgroundColor: selected ? colors.accent : colors.surface, borderColor: selected ? colors.accent : colors.border },
      ]}>
      <AppText variant="label" color={selected ? colors.onAccent : colors.text}>
        {label}
      </AppText>
    </PressableScale>
  );
}


const styles = StyleSheet.create({
  chip: {
    minHeight: layout.minTouchTarget,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: 'center',
  },
});
