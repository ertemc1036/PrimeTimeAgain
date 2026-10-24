import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { spacing } from '@/theme';

/** A labelled group of answer chips. */
export function Question({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.group}>
      <AppText variant="subheading">{label}</AppText>
      <View style={styles.chips} accessibilityRole="radiogroup">
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
