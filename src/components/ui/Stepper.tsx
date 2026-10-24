import { StyleSheet, View, type AccessibilityActionEvent } from 'react-native';

import { radii, spacing, useColors } from '@/theme';

import { AppText } from './AppText';
import { Icon } from './Icon';
import { PressableScale } from './PressableScale';

/** Numeric stepper with large touch targets; adjustable for screen readers. */
export function Stepper({
  value,
  display,
  onChange,
  step,
  min,
  max,
  decreaseLabel,
  increaseLabel,
  label,
}: {
  value: number;
  display: string;
  onChange: (v: number) => void;
  step: number;
  min: number;
  max: number;
  decreaseLabel: string;
  increaseLabel: string;
  label: string;
}) {
  const colors = useColors();
  const set = (v: number) => onChange(Math.min(Math.max(v, min), max));
  const onAction = (e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName === 'increment') set(value + step);
    if (e.nativeEvent.actionName === 'decrement') set(value - step);
  };
  return (
    <View
      style={[styles.row, { backgroundColor: colors.surface }]}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: display }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={onAction}>
      <PressableScale
        accessibilityLabel={decreaseLabel}
        onPress={() => set(value - step)}
        disabled={value <= min}
        style={[styles.btn, { backgroundColor: colors.background }, value <= min && styles.off]}>
        <Icon name="minus" size={20} />
      </PressableScale>
      <AppText variant="title" align="center" style={styles.value}>
        {display}
      </AppText>
      <PressableScale
        accessibilityLabel={increaseLabel}
        onPress={() => set(value + step)}
        disabled={value >= max}
        style={[styles.btn, { backgroundColor: colors.background }, value >= max && styles.off]}>
        <Icon name="plus" size={20} />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', padding: spacing.xs, borderRadius: radii.md, gap: spacing.sm },
  btn: { width: 52, height: 52, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  value: { flex: 1 },
  off: { opacity: 0.35 },
});
