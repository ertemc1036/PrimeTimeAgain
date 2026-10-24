import Feather from '@expo/vector-icons/Feather';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

import { useLanguage } from '@/i18n/useLanguage';
import { useColors } from '@/theme';

export type IconName = ComponentProps<typeof Feather>['name'];
export type GlyphName = ComponentProps<typeof Ionicons>['name'];

const DIRECTIONAL = new Set<string>(['chevron-right', 'chevron-left', 'arrow-right', 'arrow-left']);

/** Interface icons (Feather). Directional icons mirror in right-to-left languages. */
export function Icon({ name, size = 20, color }: { name: IconName; size?: number; color?: string }) {
  const { isRTL } = useLanguage();
  const colors = useColors();
  return (
    <Feather
      name={name}
      size={size}
      color={color ?? colors.text}
      style={isRTL && DIRECTIONAL.has(name) ? { transform: [{ scaleX: -1 }] } : undefined}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}

/** Content glyphs for goals, areas and actions (Ionicons). */
export function Glyph({ name, size = 20, color }: { name: string; size?: number; color?: string }) {
  const colors = useColors();
  return (
    <Ionicons
      name={name as GlyphName}
      size={size}
      color={color ?? colors.text}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}
