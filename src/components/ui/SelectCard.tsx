import * as Haptics from 'expo-haptics';
import { Platform, StyleSheet, View } from 'react-native';

import { colors, radii, shadows, spacing } from '@/theme';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';

export interface SelectCardProps {
  title: string;
  description?: string;
  meta?: string;
  icon?: IconName | string;
  /** Soft background used for the icon badge and the selected state. */
  tint?: string;
  accent?: string;
  selected: boolean;
  onPress: () => void;
  /** 'checkbox' for multi-select, 'radio' for single choice. */
  mode?: 'checkbox' | 'radio';
  disabled?: boolean;
}

export function SelectCard({
  title,
  description,
  meta,
  icon,
  tint = colors.primarySoft,
  accent = colors.primaryText,
  selected,
  onPress,
  mode = 'checkbox',
  disabled,
}: SelectCardProps) {
  return (
    <PressableScale
      onPress={() => {
        if (Platform.OS !== 'web') void Haptics.selectionAsync();
        onPress();
      }}
      disabled={disabled}
      accessibilityRole={mode}
      accessibilityState={{ checked: selected, disabled: !!disabled }}
      accessibilityLabel={[title, description, meta].filter(Boolean).join(', ')}
      style={[
        styles.card,
        shadows.soft,
        selected && { borderColor: accent, backgroundColor: colors.surface },
        disabled && !selected && styles.disabled,
      ]}>
      {icon ? (
        <View style={[styles.badge, { backgroundColor: tint }]}>
          <Icon name={icon} size={20} color={accent} />
        </View>
      ) : null}
      <View style={styles.text}>
        <AppText variant="subheading">{title}</AppText>
        {description ? (
          <AppText variant="caption" color={colors.textSecondary}>
            {description}
          </AppText>
        ) : null}
      </View>
      {meta ? (
        <AppText variant="label" color={colors.textMuted}>
          {meta}
        </AppText>
      ) : null}
      <View
        style={[
          mode === 'radio' ? styles.radio : styles.check,
          { borderColor: selected ? accent : colors.border, backgroundColor: selected ? accent : 'transparent' },
        ]}>
        {selected ? <Icon name="check" size={14} color={colors.textOnPrimary} /> : null}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: 'transparent',
    minHeight: 64,
  },
  badge: { width: 44, height: 44, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  check: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radio: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.5 },
});
