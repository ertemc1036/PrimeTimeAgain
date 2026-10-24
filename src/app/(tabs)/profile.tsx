import { router } from 'expo-router';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { getPreset } from '@/avatar/presets';
import { DEFAULT_AVATAR } from '@/avatar/types';
import { AppText, Card, ListRow, PressableScale, Screen, SectionHeader, StatTile } from '@/components/ui';
import { overallProgress } from '@/domain/progress';
import { useAppState } from '@/state/AppStateProvider';
import { activeGoals, useProgramInfo, useStreak } from '@/state/selectors';
import { radii, spacing, useColors } from '@/theme';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const { data, today } = useAppState();
  const info = useProgramInfo();
  const streak = useStreak();
  if (!data.profile || !info) return null;
  const progress = overallProgress(info.program, data.days, today).percent;
  const avatar = data.avatar ?? DEFAULT_AVATAR;

  return (
    <Screen inTabs title={t('profile.title')}>
      <View style={styles.identity}>
        <PressableScale onPress={() => router.push('/avatar-studio')} accessibilityRole="button" accessibilityLabel={t('profile.avatar')} style={styles.avatar}>
          <Image source={getPreset(avatar.presetId).preview} style={styles.avatarImg} contentFit="cover" accessible={false} />
        </PressableScale>
        <View style={styles.flex}>
          <AppText variant="title">{data.profile.name || '—'}</AppText>
          <AppText variant="caption" color="secondary">
            {t('common.dayOf', { day: info.day, total: info.program.durationDays })}
          </AppText>
        </View>
      </View>
      <View style={styles.stats}>
        <StatTile value={String(streak.current)} label={t('profile.streak')} />
        <StatTile value={progress === null ? '–' : t('common.percent', { value: progress })} label={t('profile.progress')} />
        <StatTile value={String(info.day)} label={t('profile.day')} />
      </View>

      <SectionHeader title={t('profile.plan')} />
      <Card padded={false}>
        <ListRow icon="user" label={t('profile.avatar')} onPress={() => router.push('/avatar-studio')} />
        <ListRow icon="target" label={t('profile.goals')} value={t('profile.goalsValue', { count: activeGoals(data.goals).length })} onPress={() => router.push('/goals')} />
        <ListRow icon="calendar" label={t('profile.duration')} value={t('common.days', { count: info.program.durationDays })} onPress={() => router.push('/plan')} />
        <ListRow icon="clock" label={t('profile.time')} value={t('common.minutes', { count: info.program.dailyMinutes })} onPress={() => router.push('/plan')} />
        <ListRow icon="edit-3" label={t('profile.editName')} value={data.profile.name || undefined} onPress={() => router.push('/edit-name')} divider={false} />
      </Card>
      <Card padded={false}>
        <ListRow icon="settings" label={t('profile.settings')} onPress={() => router.push('/settings')} />
        <ListRow icon="star" label={t('profile.pro')} value={t('profile.proValue')} onPress={() => router.push('/pro')} divider={false} />
      </Card>
      <View style={[styles.hairline, { backgroundColor: colors.border }]} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: 76, height: 96, borderRadius: radii.md, overflow: 'hidden', backgroundColor: '#08090B' },
  avatarImg: { width: '100%', height: '100%' },
  stats: { flexDirection: 'row', gap: spacing.xs },
  hairline: { height: 0 },
});
