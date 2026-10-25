import { StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '@/theme';

import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

export function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.tile} accessible accessibilityLabel={`${label}: ${value}`}>
      <AppText variant="stat">{value}</AppText>
      <AppText variant="caption" color="secondary">
        {label}
      </AppText>
    </View>
  );
}

export function ProBadge({ label }: { label: string }) {
  return (
    <View style={styles.badge}>
      <AppText variant="overline" color={colors.white}>
        {label}
      </AppText>
    </View>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <View style={styles.segmented} accessibilityRole="radiogroup">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <PressableScale
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={o.label}
            style={[styles.segment, selected && styles.segmentOn]}>
            <AppText variant="label" color={selected ? colors.white : colors.text} align="center">
              {o.label}
            </AppText>
          </PressableScale>
        );
      })}
    </View>
  );
}

export function Divider() {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />;
}

const styles = StyleSheet.create({
  tile: { flex: 1, backgroundColor: colors.card, borderRadius: radii.lg, padding: spacing.md, gap: 2, minWidth: 100 },
  badge: { alignSelf: 'flex-start', backgroundColor: colors.black, borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 4 },
  segmented: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: radii.pill, padding: 4, gap: 4 },
  segment: { flex: 1, minHeight: 40, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xs },
  segmentOn: { backgroundColor: colors.black },
});
