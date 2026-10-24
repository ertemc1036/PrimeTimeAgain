import Feather from '@expo/vector-icons/Feather';
import type { ComponentProps } from 'react';

import { useLanguage } from '@/i18n/useLanguage';
import { colors } from '@/theme';

export type IconName = ComponentProps<typeof Feather>['name'];

const DIRECTIONAL = new Set<string>(['chevron-right', 'chevron-left', 'arrow-right', 'arrow-left']);

/** Feather icon that mirrors directional glyphs in right-to-left languages. */
export function Icon({ name, size = 20, color = colors.text }: { name: IconName | string; size?: number; color?: string }) {
  const { isRTL } = useLanguage();
  const flip = isRTL && DIRECTIONAL.has(name);
  return (
    <Feather
      name={name as IconName}
      size={size}
      color={color}
      style={flip ? { transform: [{ scaleX: -1 }] } : undefined}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}
