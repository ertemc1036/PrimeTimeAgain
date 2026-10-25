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
      style={[styles.chip, { backgroundColor: selected ? colors.black : colors.card }]}>
      {icon ? <Icon name={icon} size={16} color={selected ? colors.white : colors.text} /> : null}
      <AppText variant="label" color={selected ? colors.white : colors.text}>
        {label}
      </AppText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: spacing.md, borderRadius: radii.pill },
});
