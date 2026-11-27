import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { colors, radii, spacing } from '@/theme';

import type { PrimeVariant } from './assets';
import { PrimeCharacter } from './PrimeCharacter';

/**
 * Header card of a section (Gym, Kitchen): Prime in the matching pose on his studio black, with the
 * section's key status next to him. Kept compact so the content below stays in focus.
 */
export function PrimeHero({ variant, eyebrow, title, subtitle, children }: { variant: PrimeVariant; eyebrow: string; title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <View style={styles.card}>
      <View style={styles.text}>
        <AppText variant="caption" color={colors.onDarkMuted}>
          {eyebrow}
        </AppText>
        <AppText variant="heading" color={colors.white}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" color={colors.onDarkMuted}>
            {subtitle}
          </AppText>
        ) : null}
        {children}
      </View>
      <PrimeCharacter variant={variant} size={132} radius={0} motion="idle" />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primeBackdrop, borderRadius: radii.xl, overflow: 'hidden', paddingLeft: spacing.lg, minHeight: 148 },
  text: { flex: 1, gap: 4, paddingVertical: spacing.lg },
});
