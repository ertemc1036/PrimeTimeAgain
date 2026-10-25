import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { AppText } from '@/components/ui';
import { daysBetween } from '@/domain/dates';
import type { ISODate, WeightEntry } from '@/domain/types';
import { colors, spacing } from '@/theme';

/** Minimal monochrome line chart of weight entries over time. */
export function WeightChart({ entries, format, today, label }: { entries: WeightEntry[]; format: (kg: number) => string; today: ISODate; label: string }) {
  const [width, setWidth] = useState(0);
  const height = 140;
  const pad = 12;
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  if (entries.length === 0) return null;
  const kgs = entries.map((e) => e.kg);
  const min = Math.min(...kgs);
  const max = Math.max(...kgs);
  const range = Math.max(max - min, 1);
  const first = entries[0].date;
  const span = Math.max(daysBetween(first, today), 1);
  const pts = entries.map((e) => ({
    x: pad + (daysBetween(first, e.date) / span) * (width - pad * 2),
    y: pad + (1 - (e.kg - min) / range) * (height - pad * 2),
  }));
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  return (
    <View accessible accessibilityLabel={label} onLayout={onLayout} style={styles.wrap}>
      <View style={styles.axis}>
        <AppText variant="label" color="secondary">
          {format(max)}
        </AppText>
        <AppText variant="label" color="secondary">
          {format(min)}
        </AppText>
      </View>
      {width > 0 ? (
        <Svg width={width} height={height}>
          <Line x1={pad} x2={width - pad} y1={height - pad} y2={height - pad} stroke={colors.border} strokeWidth={1} />
          {pts.length > 1 ? <Path d={d} stroke={colors.black} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" /> : null}
          {pts.map((p, i) => (
            <Circle key={i} cx={p.x} cy={p.y} r={i === pts.length - 1 ? 5 : 3} fill={colors.black} />
          ))}
        </Svg>
      ) : (
        <View style={{ height }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', gap: spacing.xs },
  axis: { flexDirection: 'row', justifyContent: 'space-between' },
});
