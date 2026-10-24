import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { AppText, Card, Icon, ListRow, PillarBadge, Screen } from '@/components/ui';
import { formatDate } from '@/i18n/format';
import { useLanguage } from '@/i18n/useLanguage';
import { useAppState } from '@/state/AppStateProvider';
import { colors, palette, radii, spacing } from '@/theme';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { code } = useLanguage();
  const { data } = useAppState();
  const profile = data.profile;
  if (!profile) return null;

  const initials = (profile.name || '·').trim().charAt(0).toLocaleUpperCase(code);

  return (
    <Screen inTabs title={t('profile.title')}>
      <Animated.View entering={FadeInDown.duration(400)}>
        <Card style={styles.identity}>
          <View style={styles.avatar}>
            <AppText variant="title" color={colors.primaryText}>
              {initials}
            </AppText>
          </View>
          <View style={styles.flex}>
            {profile.name ? <AppText variant="heading">{profile.name}</AppText> : null}
            <AppText variant="caption" color={colors.textSecondary}>
              {t('profile.since', { date: formatDate(profile.startDate, code, { day: 'numeric', month: 'long', year: 'numeric' }) })}
            </AppText>
            <View style={styles.badges}>
              {profile.focusPillars.map((p) => (
                <PillarBadge key={p} pillar={p} />
              ))}
            </View>
          </View>
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(80).duration(400)}>
        <Card padded={false}>
          <ListRow
            icon="target"
            label={t('profile.manageGoals')}
            value={t('profile.goalsCount', { count: data.goalIds.length })}
            onPress={() => router.push('/goals')}
          />
          <ListRow
            icon="clock"
            label={t('profile.dailyTime')}
            value={t('common.minutes', { count: profile.dailyMinutes })}
            onPress={() => router.push('/edit-profile')}
          />
          <ListRow icon="user" label={t('profile.editProfile')} onPress={() => router.push('/edit-profile')} />
          <ListRow icon="settings" label={t('profile.settings')} onPress={() => router.push('/settings')} />
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(160).duration(400)}>
        <Card tint={palette.peachSoft} elevated={false} style={styles.plus}>
          <View style={styles.plusHead}>
            <Icon name="star" size={18} color={palette.peachDeep} />
            <AppText variant="subheading" style={styles.flex}>
              {t('profile.plus.title')}
            </AppText>
            <View style={styles.soon}>
              <AppText variant="label" color={palette.peachDeep}>
                {t('common.comingSoon')}
              </AppText>
            </View>
          </View>
          <AppText variant="caption" color={colors.textSecondary}>
            {t('profile.plus.body')}
          </AppText>
        </Card>
      </Animated.View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  plus: { gap: spacing.xs },
  plusHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  soon: { backgroundColor: palette.white, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
});
