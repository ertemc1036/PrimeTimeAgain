import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { AppText, Glyph, Icon, PressableScale } from '@/components/ui';
import type { Mission, UserGoal } from '@/domain/types';
import { goalTitle, missionTitle } from '@/i18n/content';
import { missionGlyph } from '@/state/selectors';
import { radii, spacing, status as statusColors, useColors } from '@/theme';

/** A mission row. Tap the circle to complete (with a burst animation), tap the card for options. */
export function MissionCard({
  mission,
  goal,
  onToggle,
  onOpen,
  readOnly = false,
}: {
  mission: Mission;
  goal: UserGoal | undefined;
  onToggle: () => void;
  onOpen: () => void;
  readOnly?: boolean;
}) {
  const { t } = useTranslation();
  const colors = useColors();
  const done = mission.status === 'done';
  const inactive = mission.status === 'skipped' || mission.status === 'postponed';
  const title = missionTitle(t, mission, goal);

  const pop = useSharedValue(1);
  const burst = useSharedValue(0);
  useEffect(() => {
    if (!done) return;
    pop.set(withSequence(withSpring(1.25, { damping: 6, stiffness: 400 }), withSpring(1, { damping: 10 })));
    burst.set(withSequence(withTiming(0, { duration: 0 }), withTiming(1, { duration: 550 })));
  }, [done, pop, burst]);
  const checkStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.get() }] }));
  const burstStyle = useAnimatedStyle(() => ({ opacity: 0.5 * (1 - burst.get()), transform: [{ scale: 1 + burst.get() * 1.2 }] }));

  const statusLabel = mission.status === 'skipped' ? t('missions.skipped') : mission.status === 'postponed' ? t('missions.postponed') : null;

  return (
    <PressableScale
      onPress={onOpen}
      scaleTo={0.985}
      accessibilityRole="button"
      accessibilityLabel={`${done ? t('missions.a11yDone', { mission: title }) : t('missions.a11yOpen', { mission: title })}${statusLabel ? `, ${statusLabel}` : ''}`}
      accessibilityHint={t('missions.details')}
      style={[styles.card, { backgroundColor: done ? colors.accent : colors.surface }, inactive && styles.inactive]}>
      <View style={[styles.glyph, { backgroundColor: done ? 'rgba(127,127,127,0.25)' : colors.background }]}>
        <Glyph name={missionGlyph(mission, goal)} size={20} color={done ? colors.onAccent : colors.text} />
      </View>
      <View style={styles.text}>
        {mission.carriedFrom ? (
          <AppText variant="overline" color={done ? colors.onAccent : 'secondary'}>
            {t('missions.carried')}
          </AppText>
        ) : null}
        <AppText variant="bodyStrong" color={done ? colors.onAccent : colors.text} style={inactive && styles.strike}>
          {title}
        </AppText>
        <AppText variant="caption" color={done ? colors.onAccent : 'secondary'}>
          {[goal ? goalTitle(t, goal) : null, t('common.minutes', { count: mission.minutes }), statusLabel].filter(Boolean).join(' · ')}
        </AppText>
      </View>
      {!inactive && !readOnly ? (
        <PressableScale
          onPress={() => {
            if (Platform.OS !== 'web') {
              void (done ? Haptics.selectionAsync() : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
            }
            onToggle();
          }}
          hitSlop={8}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: done }}
          accessibilityLabel={done ? t('missions.markOpen') : t('missions.markDone')}
          style={styles.checkWrap}>
          <Animated.View style={[styles.burst, { borderColor: statusColors.prime }, burstStyle]} pointerEvents="none" />
          <Animated.View
            style={[
              styles.check,
              done ? { backgroundColor: statusColors.prime, borderColor: statusColors.prime } : { borderColor: colors.text },
              checkStyle,
            ]}>
            {done ? <Icon name="check" size={18} color="#08090B" /> : null}
          </Animated.View>
        </PressableScale>
      ) : done && readOnly ? (
        <Icon name="check-circle" size={22} color={colors.onAccent} />
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radii.md, minHeight: 76 },
  inactive: { opacity: 0.55 },
  glyph: { width: 42, height: 42, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  strike: { textDecorationLine: 'line-through' },
  checkWrap: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  check: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  burst: { position: 'absolute', width: 32, height: 32, borderRadius: 16, borderWidth: 2 },
});
