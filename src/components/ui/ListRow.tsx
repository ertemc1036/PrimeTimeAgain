import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { layout, radii, spacing, status, useColors } from '@/theme';

import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';

export interface ListRowProps {
  label: string;
  value?: string;
  hint?: string;
  icon?: IconName;
  onPress?: () => void;
  right?: ReactNode;
  destructive?: boolean;
  divider?: boolean;
}

export function ListRow({ label, value, hint, icon, onPress, right, destructive, divider = true }: ListRowProps) {
  const colors = useColors();
  const tint = destructive ? status.danger : colors.text;
  const body = (
    <>
      {icon ? (
        <View style={[styles.icon, { backgroundColor: colors.background }]}>
          <Icon name={icon} size={17} color={tint} />
        </View>
      ) : null}
      <View style={styles.text}>
        <AppText variant="bodyStrong" color={tint}>
          {label}
        </AppText>
        {hint ? (
          <AppText variant="caption" color="secondary">
            {hint}
          </AppText>
        ) : null}
      </View>
      {value ? (
        <AppText variant="caption" color="secondary" style={styles.value}>
          {value}
        </AppText>
      ) : null}
      {right}
      {onPress && !right ? <Icon name="chevron-right" size={18} color={colors.textSecondary} /> : null}
    </>
  );
  const style = [styles.row, divider && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }];
  if (!onPress) return <View style={style}>{body}</View>;
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.99}
      accessibilityRole="button"
      accessibilityLabel={[label, value].filter(Boolean).join(', ')}
      accessibilityHint={hint}
      style={style}>
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
  icon: { width: 34, height: 34, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  value: { maxWidth: '45%', textAlign: 'right' },
});
