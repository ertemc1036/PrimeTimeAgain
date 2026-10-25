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
      <View style={[styles.icon, { backgroundColor: done ? '#1F1F1F' : colors.white }]}>
        <Icon name={icon} size={22} color={done ? colors.white : colors.text} />
      </View>
      <View style={styles.text}>
        <AppText variant="bodyStrong" color={done ? colors.white : colors.text}>
          {title}
        </AppText>
        {hint ? (
          <AppText variant="caption" color={done ? '#BDBDBD' : 'secondary'} numberOfLines={3}>
            {hint}
          </AppText>
        ) : null}
      </View>
      {done ? <CheckCircleInverse /> : <Icon name="chevron-forward" size={20} color={colors.textSecondary} />}
    </PressableScale>
  );
}

function CheckCircleInverse() {
  return (
    <View style={styles.checkWrap}>
      <Icon name="checkmark" size={18} color={colors.black} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radii.lg, minHeight: 76 },
  pending: { backgroundColor: colors.card },
  done: { backgroundColor: colors.black },
  icon: { width: 44, height: 44, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  checkWrap: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
});
