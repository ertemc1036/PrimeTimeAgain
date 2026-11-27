import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { colors } from '@/theme';

/**
 * Prime, the PrimeMe AI mascot: a friendly dumbbell with a face, arms and legs.
 * Vector placeholder until the final artwork is supplied; replace the drawing here (or render the
 * image file) and every screen picks it up.
 */
export function PrimeMascot({ size = 96, mood = 'happy' }: { size?: number; mood?: 'happy' | 'thinking' }) {
  const ink = colors.onPrimary;
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" accessibilityLabel="Prime" accessible>
      {/* legs and feet */}
      <G stroke={ink} strokeWidth={5} strokeLinecap="round">
        <Path d="M50 84 L47 102" />
        <Path d="M70 84 L73 102" />
      </G>
      <Rect x={37} y={100} width={15} height={8} rx={4} fill={ink} />
      <Rect x={68} y={100} width={15} height={8} rx={4} fill={ink} />
      {/* cheering arms */}
      <G stroke={ink} strokeWidth={5} strokeLinecap="round" fill="none">
        <Path d="M42 44 Q32 34 30 20" />
        <Path d="M78 44 Q88 34 90 20" />
      </G>
      <Circle cx={30} cy={18} r={5.5} fill={ink} />
      <Circle cx={90} cy={18} r={5.5} fill={ink} />
      {/* weight plates */}
      <Rect x={6} y={36} width={16} height={50} rx={7} fill={ink} />
      <Rect x={98} y={36} width={16} height={50} rx={7} fill={ink} />
      <Rect x={18} y={46} width={12} height={30} rx={5} fill="#2A2A2A" />
      <Rect x={90} y={46} width={12} height={30} rx={5} fill="#2A2A2A" />
      {/* body: the neon grip */}
      <Rect x={29} y={36} width={62} height={50} rx={24} fill={colors.primary} stroke={ink} strokeWidth={4} />
      {/* face */}
      {mood === 'thinking' ? (
        <>
          <Circle cx={51} cy={55} r={4.5} fill={ink} />
          <Circle cx={71} cy={55} r={4.5} fill={ink} />
          <Circle cx={52.5} cy={53} r={1.4} fill={colors.white} />
          <Circle cx={72.5} cy={53} r={1.4} fill={colors.white} />
          <Path d="M53 70 L67 69" stroke={ink} strokeWidth={3.5} strokeLinecap="round" />
        </>
      ) : (
        <>
          <Circle cx={50} cy={57} r={4.5} fill={ink} />
          <Circle cx={70} cy={57} r={4.5} fill={ink} />
          <Circle cx={51.5} cy={55.5} r={1.4} fill={colors.white} />
          <Circle cx={71.5} cy={55.5} r={1.4} fill={colors.white} />
          <Path d="M50 67 Q60 76 70 67" stroke={ink} strokeWidth={3.5} strokeLinecap="round" fill="none" />
          <Circle cx={42} cy={66} r={3} fill="#9ED13A" />
          <Circle cx={78} cy={66} r={3} fill="#9ED13A" />
        </>
      )}
    </Svg>
  );
}
