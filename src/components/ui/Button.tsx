import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';

import { layout, radii, spacing, status, useColors } from '@/theme';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'lg' | 'md';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
  fullWidth?: boolean;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  icon,
  loading,
  disabled,
  accessibilityHint,
  fullWidth = true,
}: ButtonProps) {
  const colors = useColors();
  const fill = variant === 'primary' ? colors.accent : variant === 'danger' ? status.danger : 'transparent';
  const fg = variant === 'primary' ? colors.onAccent : variant === 'danger' ? '#FFFFFF' : colors.text;
  const inactive = disabled || loading;

  return (
    <PressableScale
      onPress={() => {
        if (Platform.OS !== 'web') void Haptics.selectionAsync();
        onPress?.();
      }}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      style={[
        styles.base,
        size === 'md' && styles.md,
        { backgroundColor: fill, alignSelf: fullWidth ? 'stretch' : 'flex-start' },
        variant === 'secondary' && { borderWidth: 1.5, borderColor: colors.text },
        inactive && styles.disabled,
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.row}>
          <AppText variant="button" color={fg} align="center" style={styles.label}>
            {label}
          </AppText>
          {icon ? <Icon name={icon} size={18} color={fg} /> : null}
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 56,
    minWidth: layout.minTouchTarget,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  md: { minHeight: 46, paddingHorizontal: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, flexShrink: 1 },
  label: { flexShrink: 1 },
  disabled: { opacity: 0.4 },
});
