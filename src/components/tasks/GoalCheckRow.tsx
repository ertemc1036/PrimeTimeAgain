import * as Haptics from 'expo-haptics';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { AppText, Icon, PressableScale } from '@/components/ui';
import type { GoalDefinition } from '@/domain/types';
import { goalKey } from '@/i18n/keys';
import { colors, pillarColors, radii, shadows, spacing } from '@/theme';

export function GoalCheckRow({ goal, done, onToggle }: { goal: GoalDefinition; done: boolean; onToggle: () => void }) {
  const { t } = useTranslation();
  const c = pillarColors[goal.pillar];
  const title = t(goalKey(goal.id, 'task'));

  return (
    <PressableScale
      onPress={() => {
        if (Platform.OS !== 'web') {
          void (done ? Haptics.selectionAsync() : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
        }
        onToggle();
      }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={done ? t('a11y.goalDone', { goal: title }) : t('a11y.goalOpen', { goal: title })}
      accessibilityHint={t('a11y.toggleGoalHint')}
      style={[styles.row, shadows.soft, done && { backgroundColor: c.soft }]}>
      <View style={[styles.icon, { backgroundColor: c.tint }]}>
        <Icon name={goal.icon} size={18} color={c.strong} />
      </View>
      <View style={styles.text}>
        <AppText variant="bodyStrong" color={done ? colors.textSecondary : colors.text}>
          {title}
        </AppText>
        <AppText variant="caption" color={colors.textMuted}>
          {t(goalKey(goal.id, 'title'))} · {t('common.minutes', { count: goal.minutes })}
        </AppText>
      </View>
      <View style={[styles.check, { borderColor: done ? c.strong : colors.border }, done && { backgroundColor: c.strong }]}>
        {done ? (
          <Animated.View entering={ZoomIn.springify().damping(14)}>
            <Icon name="check" size={16} color={colors.textOnPrimary} />
          </Animated.View>
        ) : null}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    minHeight: 72,
  },
  icon: { width: 40, height: 40, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  check: { width: 30, height: 30, borderRadius: radii.pill, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
