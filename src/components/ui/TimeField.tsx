import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { formatTime, parseTime } from '@/domain/dates';
import { colors, fonts, radii, spacing, webNoOutline } from '@/theme';

import { AppText } from './AppText';
import { Icon } from './Icon';
import { PressableScale } from './PressableScale';

/**
 * Time input: type HH:MM directly or nudge by 15 minutes. Works the same on iOS, Android and web,
 * and is adjustable for screen readers.
 */
export function TimeField({ label, value, onChange, error, step = 15 }: { label: string; value: string; onChange: (v: string) => void; error?: string; step?: number }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(value);
  const [synced, setSynced] = useState(value);
  // Follow external changes (nudges, presets) without an effect.
  if (synced !== value) {
    setSynced(value);
    setDraft(value);
  }
  const nudge = (delta: number) => onChange(formatTime((parseTime(value) ?? 12 * 60) + delta));

  return (
    <View style={styles.wrap}>
      <AppText variant="label">{label}</AppText>
      <View
        style={[styles.row, { borderColor: error ? colors.black : colors.card }]}
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ text: value || t('common.notSet') }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => nudge(e.nativeEvent.actionName === 'increment' ? step : -step)}>
        <PressableScale onPress={() => nudge(-step)} accessibilityLabel={t('common.earlier')} style={styles.btn}>
          <Icon name="remove" size={20} />
        </PressableScale>
        <TextInput
          value={draft}
          onChangeText={(v) => {
            const clean = v.replace(/[^0-9:]/g, '').slice(0, 5);
            setDraft(clean);
            const auto = /^\d{4}$/.test(clean) ? `${clean.slice(0, 2)}:${clean.slice(2)}` : clean;
            if (parseTime(auto) !== null) onChange(formatTime(parseTime(auto)!));
          }}
          onBlur={() => setDraft(value)}
          placeholder="--:--"
          placeholderTextColor={colors.textSecondary}
          keyboardType="numbers-and-punctuation"
          accessibilityLabel={label}
          maxLength={5}
          style={[styles.input, webNoOutline]}
        />
        <PressableScale onPress={() => nudge(step)} accessibilityLabel={t('common.later')} style={styles.btn}>
          <Icon name="add" size={20} />
        </PressableScale>
      </View>
      {error ? (
        <AppText variant="caption" accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: radii.md, borderWidth: 1.5, padding: 4 },
  btn: { width: 48, height: 48, borderRadius: radii.sm, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, textAlign: 'center', fontFamily: fonts.bold, fontSize: 22, color: colors.text, fontVariant: ['tabular-nums'] },
  error: { fontFamily: fonts.semibold },
});
