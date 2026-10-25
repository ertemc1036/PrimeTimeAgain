import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';

import { colors, layout, radii, spacing } from '@/theme';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  /** primary = black, secondary = light grey, ghost = text only */
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'lg' | 'md' | 'sm';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
  fullWidth?: boolean;
}

const FILL = { primary: colors.black, secondary: colors.card, ghost: 'transparent', outline: colors.white } as const;

export function Button({ label, onPress, variant = 'primary', size = 'lg', icon, loading, disabled, accessibilityHint, fullWidth = true }: ButtonProps) {
  const inactive = disabled || loading;
  const fg = inactive && variant === 'primary' ? colors.white : variant === 'primary' ? colors.white : colors.text;
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
        styles[size],
        { backgroundColor: inactive && variant === 'primary' ? colors.disabled : FILL[variant], alignSelf: fullWidth ? 'stretch' : 'flex-start' },
        variant === 'outline' && { borderWidth: 1, borderColor: colors.border },
        inactive && variant !== 'primary' && styles.dim,
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.row}>
          {icon ? <Icon name={icon} size={size === 'sm' ? 16 : 19} color={fg} /> : null}
          <AppText variant="button" color={fg} align="center" style={[styles.label, size === 'sm' && styles.small]}>
            {label}
          </AppText>
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  lg: { minHeight: 56 },
  md: { minHeight: layout.minTouchTarget },
  sm: { minHeight: 40, paddingHorizontal: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 1 },
  label: { flexShrink: 1 },
  small: { fontSize: 14 },
  dim: { opacity: 0.45 },
});
