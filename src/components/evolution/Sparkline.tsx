import { View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

import { useColors } from '@/theme';

/** Minimal trend line for a series of values (decorative; values are shown as text nearby). */
export function Sparkline({ values, width = 120, height = 40 }: { values: number[]; width?: number; height?: number }) {
  const colors = useColors();
  if (values.length < 2) return <View style={{ width, height }} />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * (width - 8) + 4, height - 4 - ((v - min) / span) * (height - 8)]);
  const last = pts[pts.length - 1];
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants">
      <Svg width={width} height={height}>
        <Polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={colors.text} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <Circle cx={last[0]} cy={last[1]} r={3.5} fill={colors.text} />
      </Svg>
    </View>
  );
}
