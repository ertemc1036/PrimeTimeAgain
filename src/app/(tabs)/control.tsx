import { router, useIsFocused } from 'expo-router';
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AvatarViewer } from '@/avatar/AvatarViewer';
import { getPreset } from '@/avatar/presets';
import { DEFAULT_AVATAR } from '@/avatar/types';
import { GoalModule } from '@/components/control/GoalModule';
import { SLOT_LAYOUTS } from '@/components/control/modulePositions';
import { AppText, Button, Icon, IconButton, PressableScale } from '@/components/ui';
import { BRAND_NAME } from '@/config/brand';
import { activeAreas, areaProgress } from '@/domain/progress';
import { useAppState } from '@/state/AppStateProvider';
import { useProgramInfo, useStreak, useToday } from '@/state/selectors';
import { darkColors, layout, palette, radii, spacing, ThemeProvider } from '@/theme';

/** Prime Control: the user's avatar at the centre, their life areas around it. */
export default function ControlScreen() {
  return (
    <ThemeProvider mode="dark">
      <ControlBody />
    </ThemeProvider>
  );
}

function ControlBody() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const { data, today } = useAppState();
  const info = useProgramInfo();
  const streak = useStreak();
  const todayInfo = useToday();
  const [showNote, setShowNote] = useState(false);
  const avatar = data.avatar ?? DEFAULT_AVATAR;

  const modules = useMemo(() => {
    if (!data.program) return [];
    return activeAreas(data.goals)
      .slice(0, 6)
      .map((area) => ({ area, tally: areaProgress(area, data.goals, data.program!, data.days, today) }));
  }, [data.goals, data.days, data.program, today]);
  const slots = SLOT_LAYOUTS[modules.length] ?? [];

  const status = info?.complete
    ? t('control.programComplete')
    : todayInfo.recovery
      ? t('control.todayRecovery')
      : todayInfo.type === 'prime'
        ? t('control.todayComplete')
        : t('control.todayStatus', { done: todayInfo.doneCount, total: todayInfo.total });

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <AppText variant="subheading" color={palette.white} accessibilityRole="header">
            {BRAND_NAME}
          </AppText>
          {info ? (
            <AppText variant="overline" color="secondary">
              {t('common.dayOf', { day: info.day, total: info.program.durationDays })}
            </AppText>
          ) : null}
        </View>
        <IconButton icon="message-circle" label={t('control.coach')} onPress={() => router.push('/coach')} />
        <IconButton icon="bell" label={t('control.notifications')} onPress={() => router.push('/settings')} />
        <PressableScale onPress={() => router.push('/profile')} accessibilityRole="button" accessibilityLabel={t('control.profile')} style={styles.avatarBtn}>
          <Image source={getPreset(avatar.presetId).preview} style={styles.avatarImg} contentFit="cover" accessible={false} />
        </PressableScale>
      </View>

      <View style={styles.stage}>
        <AvatarViewer config={avatar} active={focused} background={darkColors.background} autoRotate={false} />
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {modules.map((m, i) => {
            const slot = slots[i];
            return (
              <View
                key={m.area}
                pointerEvents="box-none"
                style={[styles.slot, slot.side === 'left' ? styles.left : styles.right, { top: `${8 + slot.row * 30}%` }]}>
                <GoalModule area={m.area} tally={m.tally} delay={250 + i * 90} onPress={() => router.push({ pathname: '/area/[id]', params: { id: m.area } })} />
              </View>
            );
          })}
          {modules.length === 0 ? (
            <View style={styles.noGoals}>
              <Button label={t('control.addGoal')} variant="secondary" size="md" fullWidth={false} onPress={() => router.push('/goals')} />
            </View>
          ) : null}
        </View>
      </View>

      <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.bottom}>
        <View style={styles.statusRow}>
          <View style={styles.streak} accessible accessibilityLabel={t('control.streak', { count: streak.current })}>
            <Icon name="zap" size={14} color={palette.black} />
            <AppText variant="label" color={palette.black}>
              {t('control.streak', { count: streak.current })}
            </AppText>
          </View>
          <AppText variant="caption" color="secondary" style={styles.flex} numberOfLines={2}>
            {status}
          </AppText>
          <Pressable onPress={() => setShowNote((s) => !s)} accessibilityRole="button" accessibilityLabel={t('control.progressNote')} hitSlop={10}>
            <Icon name="info" size={18} color={palette.mist} />
          </Pressable>
        </View>
        {showNote ? (
          <AppText variant="caption" color="secondary">
            {t('control.progressNote')}
          </AppText>
        ) : null}
        <Button
          label={todayInfo.type === 'prime' || todayInfo.recovery ? t('control.ctaDone') : t('control.cta')}
          icon="arrow-right"
          onPress={() => router.push('/missions')}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: darkColors.background },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: layout.screenPadding, paddingVertical: spacing.xs },
  avatarBtn: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', borderWidth: 1.5, borderColor: palette.graphite },
  avatarImg: { width: '100%', height: '120%' },
  stage: { flex: 1 },
  slot: { position: 'absolute' },
  left: { left: spacing.sm },
  right: { right: spacing.sm },
  noGoals: { position: 'absolute', bottom: spacing.lg, alignSelf: 'center' },
  bottom: { paddingHorizontal: layout.screenPadding, paddingBottom: spacing.md, paddingTop: spacing.xs, gap: spacing.sm },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: palette.white,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
});
