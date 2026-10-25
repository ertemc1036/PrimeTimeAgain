import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, layout, spacing } from '@/theme';

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
  divider?: boolean;
}

export function ListRow({ label, value, hint, icon, onPress, right, divider = true }: ListRowProps) {
  const body = (
    <>
      {icon ? <Icon name={icon} size={20} /> : null}
      <View style={styles.text}>
        <AppText variant="bodyStrong">{label}</AppText>
        {hint ? (
          <AppText variant="caption" color="secondary">
            {hint}
          </AppText>
        ) : null}
      </View>
      {value ? (
        <AppText variant="caption" color="secondary" style={styles.value} numberOfLines={3}>
          {value}
        </AppText>
      ) : null}
      {right}
      {onPress && !right ? <Icon name="chevron-forward" size={18} color={colors.disabled} /> : null}
    </>
  );
  const style = [styles.row, divider && styles.divider];
  return onPress ? (
    <PressableScale onPress={onPress} scaleTo={0.99} accessibilityRole="button" accessibilityLabel={[label, value].filter(Boolean).join(', ')} accessibilityHint={hint} style={style}>
      {body}
    </PressableScale>
  ) : (
    <View style={style} accessible accessibilityLabel={[label, value, hint].filter(Boolean).join(', ')}>
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, minHeight: layout.minTouchTarget + 8 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  text: { flex: 1, gap: 2 },
  value: { maxWidth: '55%', textAlign: 'right' },
});
