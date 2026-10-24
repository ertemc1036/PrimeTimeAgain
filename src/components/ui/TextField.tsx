import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { useLanguage } from '@/i18n/useLanguage';
import { radii, spacing, status, useColors } from '@/theme';

import { AppText } from './AppText';

export interface TextFieldProps extends TextInputProps {
  label: string;
  hint?: string;
  error?: string;
  optional?: string;
}

export function TextField({ label, hint, error, optional, style, multiline, ...rest }: TextFieldProps) {
  const { isRTL } = useLanguage();
  const colors = useColors();
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
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={hint}
        placeholderTextColor={colors.textSecondary}
        multiline={multiline}
        style={[
          styles.input,
          { backgroundColor: colors.surface, color: colors.text, borderColor: error ? status.danger : colors.surface },
          multiline && styles.multiline,
          { textAlign: isRTL ? 'right' : 'left' },
          style,
        ]}
        {...rest}
      />
      {error ? (
        <AppText variant="caption" color={status.danger} accessibilityLiveRegion="polite">
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
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  flex: { flex: 1 },
  input: { minHeight: 52, borderRadius: radii.sm, borderWidth: 1.5, paddingHorizontal: spacing.md, fontSize: 16 },
  multiline: { minHeight: 110, paddingTop: spacing.sm, textAlignVertical: 'top' },
});
