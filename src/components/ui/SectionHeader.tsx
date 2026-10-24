import { Pressable, StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/theme';

import { AppText } from './AppText';

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.row}>
      <AppText variant="heading" style={styles.title}>
        {title}
      </AppText>
      {action && onAction ? (
        <Pressable onPress={onAction} accessibilityRole="button" hitSlop={12}>
          <AppText variant="label" color={colors.primaryText}>
            {action}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, marginTop: spacing.xs },
  title: { flex: 1 },
});
