import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';

import { colors, layout, radii, shadows, spacing } from '@/theme';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';

type Variant = 'primary' | 'secondary' | 'ghost';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
  fullWidth?: boolean;
}

const variantStyles = {
  primary: { bg: colors.primaryStrong, fg: colors.textOnPrimary },
  secondary: { bg: colors.primarySoft, fg: colors.primaryText },
  ghost: { bg: 'transparent', fg: colors.primaryText },
} as const;

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading,
  disabled,
  accessibilityHint,
  fullWidth = true,
}: ButtonProps) {
  const v = variantStyles[variant];
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
        { backgroundColor: v.bg, alignSelf: fullWidth ? 'stretch' : 'flex-start' },
        variant === 'primary' && shadows.soft,
        inactive && styles.disabled,
      ]}>
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <View style={styles.row}>
          <AppText variant="bodyStrong" color={v.fg} style={styles.label}>
            {label}
          </AppText>
          {icon ? <Icon name={icon} size={18} color={v.fg} /> : null}
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 54,
    minWidth: layout.minTouchTarget,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  label: { fontSize: 17 },
  disabled: { opacity: 0.5 },
});
