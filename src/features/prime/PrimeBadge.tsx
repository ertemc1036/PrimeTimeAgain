import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';

import { colors } from '@/theme';

/**
 * Prime's mark: a black circle with a simple symbol. A deliberately neutral placeholder until the
 * final Prime design exists; swap the inside here and every screen follows.
 */
export function PrimeBadge({ size = 44, ring }: { size?: number; ring?: string }) {
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="Prime"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.black,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: ring ? 3 : 0,
        borderColor: ring,
      }}>
      <Ionicons name="sparkles" size={Math.round(size * 0.42)} color={colors.white} />
    </View>
  );
}
