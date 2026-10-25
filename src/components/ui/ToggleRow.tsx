import { StyleSheet, Switch, View } from 'react-native';

import { colors, layout, spacing } from '@/theme';

import { AppText } from './AppText';

export function ToggleRow({ label, hint, value, onChange, disabled, divider = true }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean; divider?: boolean }) {
  return (
    <View style={[styles.row, divider && styles.divider, disabled && styles.dim]}>
      <View style={styles.text}>
        <AppText variant="bodyStrong">{label}</AppText>
        {hint ? (
          <AppText variant="caption" color="secondary">
            {hint}
          </AppText>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        accessibilityLabel={label}
        trackColor={{ false: colors.border, true: colors.black }}
        thumbColor={colors.white}
        ios_backgroundColor={colors.border}
        {...({ activeThumbColor: colors.white } as object)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, minHeight: layout.minTouchTarget + 8 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  text: { flex: 1, gap: 2 },
  dim: { opacity: 0.45 },
});
