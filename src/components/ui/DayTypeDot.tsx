import { View } from 'react-native';

import type { DayType } from '@/domain/days';
import { status, useColors } from '@/theme';

/** Colour key for day types; shared by the calendar, legend and summaries. */
export function useDayTypeColor() {
  const colors = useColors();
  return (type: DayType): { fill: string; text: string; outline?: string } => {
    switch (type) {
      case 'prime':
        return { fill: status.prime, text: '#08090B' };
      case 'active':
        return { fill: status.active, text: '#08090B' };
      case 'recovery':
        return { fill: status.recovery, text: '#08090B' };
      case 'missed':
        return { fill: 'transparent', text: colors.textSecondary, outline: colors.border };
      case 'open':
        return { fill: 'transparent', text: colors.text, outline: colors.text };
      default:
        return { fill: 'transparent', text: colors.textSecondary };
    }
  };
}

export function DayTypeDot({ type, size = 10 }: { type: DayType; size?: number }) {
  const c = useDayTypeColor()(type);
  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: c.fill, borderWidth: c.outline ? 1.5 : 0, borderColor: c.outline }}
    />
  );
}
