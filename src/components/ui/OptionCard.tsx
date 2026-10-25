import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '@/theme';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';

/** Large selectable card (activity type, goals, options). Selected = solid black. */
export function OptionCard({
  title,
  subtitle,
  icon,
  selected,
  onPress,
  mode = 'radio',
  layout = 'row',
  right,
  disabled,
}: {
  title: string;
  subtitle?: string;
  icon?: IconName;
  selected: boolean;
  onPress: () => void;
  mode?: 'radio' | 'checkbox';
  layout?: 'row' | 'tile';
  right?: ReactNode;
  disabled?: boolean;
}) {
  const fg = selected ? colors.white : colors.text;
  return (
    <PressableScale
      onPress={() => {
        if (Platform.OS !== 'web') void Haptics.selectionAsync();
        onPress();
      }}
      disabled={disabled}
      accessibilityRole={mode}
      accessibilityState={{ checked: selected, disabled: !!disabled }}
      accessibilityLabel={[title, subtitle].filter(Boolean).join(', ')}
      style={[layout === 'tile' ? styles.tile : styles.row, { backgroundColor: selected ? colors.black : colors.card }, disabled && styles.disabled]}>
      {icon ? (
        <View style={[styles.icon, { backgroundColor: selected ? '#1F1F1F' : colors.white }]}>
          <Icon name={icon} size={22} color={fg} />
        </View>
      ) : null}
      <View style={layout === 'tile' ? styles.tileText : styles.text}>
        <AppText variant="subheading" color={fg}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" color={selected ? '#D9D9D9' : 'secondary'}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right}
      {layout === 'row' && !right ? (
        <View style={[styles.mark, mode === 'checkbox' && styles.square, { borderColor: selected ? colors.white : colors.disabled, backgroundColor: selected ? colors.white : 'transparent' }]}>
          {selected ? <Icon name="checkmark" size={15} color={colors.black} /> : null}
        </View>
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radii.lg, minHeight: 72 },
  tile: { flexBasis: '47%', flexGrow: 1, padding: spacing.md, borderRadius: radii.lg, minHeight: 128, gap: spacing.md, justifyContent: 'space-between' },
  icon: { width: 44, height: 44, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  tileText: { gap: 2 },
  mark: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  square: { borderRadius: 7 },
  disabled: { opacity: 0.45 },
});
