import { StyleSheet, View } from 'react-native';

import { AppText, Icon, PressableScale, type IconName } from '@/components/ui';
import { colors, radii, spacing } from '@/theme';

/** One of the three automatic Today cards. State comes from saved data; there is no manual toggle. */
export function MissionCard({ icon, title, hint, done, onPress }: { icon: IconName; title: string; hint?: string; done: boolean; onPress: () => void }) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[title, hint].filter(Boolean).join('. ')}
      accessibilityState={{ checked: done }}
      style={[styles.card, done ? styles.done : styles.pending]}>
      <View style={[styles.icon, { backgroundColor: done ? colors.primary : colors.white }]}>
        <Icon name={icon} size={20} color={colors.black} />
      </View>
      <View style={styles.text}>
        <AppText variant="bodyStrong">{title}</AppText>
        {hint ? (
          <AppText variant="caption" color="secondary" numberOfLines={3}>
            {hint}
          </AppText>
        ) : null}
      </View>
      {done ? <CheckBadge /> : <Icon name="chevron-forward" size={20} color={colors.textSecondary} />}
    </PressableScale>
  );
}

function CheckBadge() {
  return (
    <View style={styles.checkWrap}>
      <Icon name="checkmark" size={16} color={colors.white} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.sm, paddingRight: spacing.md, borderRadius: radii.lg, minHeight: 68 },
  pending: { backgroundColor: colors.backgroundAlt },
  done: { backgroundColor: colors.primarySoft },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  checkWrap: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.black, alignItems: 'center', justifyContent: 'center' },
});
