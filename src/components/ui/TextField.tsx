import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { useLanguage } from '@/i18n/useLanguage';
import { colors, radii, spacing } from '@/theme';

import { AppText } from './AppText';

export interface TextFieldProps extends TextInputProps {
  label: string;
  hint?: string;
  error?: string;
}

export function TextField({ label, hint, error, style, multiline, ...rest }: TextFieldProps) {
  const { isRTL } = useLanguage();
  return (
    <View style={styles.wrap}>
      <AppText variant="label" color={colors.textSecondary}>
        {label}
      </AppText>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={hint}
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
        style={[
          styles.input,
          multiline && styles.multiline,
          { textAlign: isRTL ? 'right' : 'left' },
          error ? { borderColor: colors.danger } : null,
          style,
        ]}
        {...rest}
      />
      {error ? (
        <AppText variant="caption" color={colors.danger} accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" color={colors.textMuted}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  input: {
    minHeight: 54,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    fontSize: 17,
    color: colors.text,
  },
  multiline: { minHeight: 140, paddingTop: spacing.md, textAlignVertical: 'top' },
});
