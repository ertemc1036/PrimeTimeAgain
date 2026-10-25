import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Chip, TextField } from '@/components/ui';
import { spacing } from '@/theme';

/** Free-text list with quick suggestions (food preferences, allergies…). */
export function TagInput({ label, values, onChange, suggestions = [], hint }: { label: string; values: string[]; onChange: (v: string[]) => void; suggestions?: string[]; hint?: string }) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const toggle = (v: string) => onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v]);
  const submit = () => {
    const v = text.trim();
    if (v && !values.includes(v)) onChange([...values, v.slice(0, 40)]);
    setText('');
  };
  const options = [...new Set([...suggestions, ...values])];
  return (
    <View style={styles.wrap}>
      <AppText variant="subheading">{label}</AppText>
      {hint ? (
        <AppText variant="caption" color="secondary">
          {hint}
        </AppText>
      ) : null}
      <View style={styles.chips}>
        {options.map((o) => (
          <Chip key={o} label={o} selected={values.includes(o)} onPress={() => toggle(o)} />
        ))}
      </View>
      <TextField label={t('onboarding.nutrition.addPlaceholder')} value={text} onChangeText={setText} onSubmitEditing={submit} onBlur={submit} returnKeyType="done" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
