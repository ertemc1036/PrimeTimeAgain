import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { colors, fonts, radii, spacing, webNoOutline } from '@/theme';

import { AppText } from './AppText';

export interface TextFieldProps extends TextInputProps {
  label: string;
  hint?: string;
  error?: string;
  optional?: string;
  suffix?: string;
}

export function TextField({ label, hint, error, optional, suffix, style, multiline, onFocus, onBlur, ...rest }: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <AppText variant="label" style={styles.flex}>
          {label}
        </AppText>
        {optional ? (
          <AppText variant="caption" color="secondary">
            {optional}
          </AppText>
        ) : null}
      </View>
      <View style={[styles.box, { borderColor: error || focused ? colors.black : colors.card }, multiline && styles.multiBox]}>
        <TextInput
          accessibilityLabel={label}
          accessibilityHint={error ?? hint}
          placeholderTextColor={colors.textSecondary}
          multiline={multiline}
          style={[styles.input, multiline && styles.multiline, webNoOutline, style]}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
        {suffix ? (
          <AppText variant="bodyStrong" color="secondary">
            {suffix}
          </AppText>
        ) : null}
      </View>
      {error ? (
        <AppText variant="caption" accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" color="secondary">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  labelRow: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 54,
    borderRadius: radii.md,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  multiBox: { alignItems: 'flex-start' },
  input: { flex: 1, fontFamily: fonts.regular, fontSize: 16, color: colors.text, paddingVertical: 14 },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  error: { fontFamily: fonts.semibold },
});
