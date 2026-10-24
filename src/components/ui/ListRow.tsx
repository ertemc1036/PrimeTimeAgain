import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, layout, radii, spacing } from '@/theme';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';

export interface ListRowProps {
  label: string;
  value?: string;
  hint?: string;
  icon?: IconName;
  iconTint?: string;
  onPress?: () => void;
  right?: ReactNode;
  destructive?: boolean;
}

export function ListRow({ label, value, hint, icon, iconTint = colors.surfaceAlt, onPress, right, destructive }: ListRowProps) {
  const body = (
    <>
      {icon ? (
        <View style={[styles.icon, { backgroundColor: destructive ? colors.dangerSoft : iconTint }]}>
          <Icon name={icon} size={18} color={destructive ? colors.danger : colors.primaryText} />
        </View>
      ) : null}
      <View style={styles.text}>
        <AppText variant="bodyStrong" color={destructive ? colors.danger : colors.text}>
          {label}
        </AppText>
        {hint ? (
          <AppText variant="caption" color={colors.textSecondary}>
            {hint}
          </AppText>
        ) : null}
      </View>
      {value ? (
        <AppText variant="caption" color={colors.textSecondary}>
          {value}
        </AppText>
      ) : null}
      {right}
      {onPress && !right ? <Icon name="chevron-right" size={18} color={colors.textMuted} /> : null}
    </>
  );

  if (!onPress) return <View style={styles.row}>{body}</View>;
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.99}
      accessibilityRole="button"
      accessibilityLabel={[label, value].filter(Boolean).join(', ')}
      accessibilityHint={hint}
      style={styles.row}>
      {body}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minHeight: layout.minTouchTarget + 12,
  },
  icon: { width: 36, height: 36, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
});
