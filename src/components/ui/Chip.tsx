import { StyleSheet } from 'react-native';

import { colors, radii, spacing } from '@/theme';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';

export function Chip({ label, selected, onPress, mode = 'checkbox', icon }: { label: string; selected: boolean; onPress: () => void; mode?: 'checkbox' | 'radio'; icon?: IconName }) {
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.95}
      accessibilityRole={mode}
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      style={[styles.chip, selected ? styles.on : styles.off]}>
      {icon ? <Icon name={icon} size={16} color={colors.text} /> : null}
      <AppText variant="label" color={colors.text}>
        {label}
      </AppText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  off: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  on: { backgroundColor: colors.selected, borderWidth: 1, borderColor: colors.text },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: spacing.md, borderRadius: radii.pill },
});
