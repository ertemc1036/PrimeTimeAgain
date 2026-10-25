import { router, type Href } from 'expo-router';
import { Linking, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Card, ListRow, ProBadge, Screen, type IconName } from '@/components/ui';
import { APP_VERSION, INSTAGRAM_HANDLE, INSTAGRAM_URL } from '@/config/app';
import { env } from '@/config/env';
import { getLanguage } from '@/i18n/languages';
import { useLanguage } from '@/i18n/useLanguage';
import { useAppState } from '@/state/AppStateProvider';
import { usePro } from '@/state/ProProvider';
import { spacing } from '@/theme';

type Row = { label: string; icon: IconName; href?: Href; onPress?: () => void; value?: string };

export default function SettingsHub() {
  const { t } = useTranslation();
  const { data } = useAppState();
  const { isPro } = usePro();
  const p = data.profile;
  const n = data.notifications;
  const lang = useLanguage();

  const sections: { title: string; rows: Row[] }[] = [
    {
      title: t('profile.account'),
      rows: [
        { label: t('account.title'), icon: 'person-outline', href: '/settings/account' },
        { label: t('profile.language'), icon: 'globe-outline', href: '/language', value: getLanguage(lang).nativeName },
      ],
    },
    {
      title: t('profile.health'),
      rows: [{ label: t('health.title'), icon: 'heart-outline', href: '/settings/health' }],
    },
    {
      title: t('profile.routine'),
      rows: [
        { label: t('profile.discipline'), icon: 'notifications-outline', href: '/settings/notifications', value: n.enabled ? t(`notifications.modes.${n.mode}.title`) : t('common.off') },
        { label: t('profile.eatingWindow'), icon: 'time-outline', href: '/settings/eating-window', value: data.eatingWindow.enabled ? `${data.eatingWindow.start}–${data.eatingWindow.end}` : t('common.off') },
        { label: t('profile.planningTime'), icon: 'calendar-outline', href: '/settings/health', value: p?.planningTime },
        { label: t('profile.mealHistory'), icon: 'restaurant-outline', href: '/history/meals' },
        { label: t('profile.workoutHistory'), icon: 'barbell-outline', href: '/history/workouts' },
      ],
    },
    { title: t('profile.premium'), rows: [{ label: isPro ? t('profile.proActive') : t('profile.upgrade'), icon: 'sparkles-outline', href: '/pro' }] },
    { title: t('profile.privacy'), rows: [{ label: t('privacy.title'), icon: 'shield-checkmark-outline', href: '/settings/privacy' }] },
    {
      title: t('profile.info'),
      rows: [
        { label: t('profile.privacyPolicy'), icon: 'document-text-outline', onPress: () => (env.privacyPolicyUrl ? void Linking.openURL(env.privacyPolicyUrl) : router.push({ pathname: '/settings/legal', params: { doc: 'privacy' } })) },
        { label: t('profile.terms'), icon: 'document-outline', onPress: () => (env.termsUrl ? void Linking.openURL(env.termsUrl) : router.push({ pathname: '/settings/legal', params: { doc: 'terms' } })) },
        { label: t('profile.instagram'), icon: 'logo-instagram', value: INSTAGRAM_HANDLE, onPress: () => void Linking.openURL(INSTAGRAM_URL) },
        { label: t('profile.help'), icon: 'help-circle-outline', onPress: () => router.push({ pathname: '/settings/legal', params: { doc: 'help' } }) },
        { label: t('profile.contact'), icon: 'mail-outline', onPress: () => (env.supportEmail ? void Linking.openURL(`mailto:${env.supportEmail}`) : router.push({ pathname: '/settings/legal', params: { doc: 'contact' } })) },
      ],
    },
  ];

  return (
    <Screen back="back" title={t('profile.title')}>
      <Card style={styles.header}>
        <View style={styles.flex}>
          <AppText variant="heading">{p?.name}</AppText>
          <AppText variant="caption" color="secondary">
            {isPro ? t('profile.proActive') : t('profile.free')}
          </AppText>
        </View>
        {isPro ? <ProBadge label={t('common.pro')} /> : null}
      </Card>
      {sections.map((s) => (
        <View key={s.title} style={styles.section}>
          <AppText variant="overline" color="secondary">
            {s.title}
          </AppText>
          <Card variant="outline" padded={false}>
            {s.rows.map((r, i) => (
              <ListRow key={r.label} label={r.label} icon={r.icon} value={r.value} onPress={r.onPress ?? (() => r.href && router.push(r.href))} divider={i < s.rows.length - 1} />
            ))}
          </Card>
        </View>
      ))}
      <AppText variant="caption" color="secondary" align="center">
        {t('brand.name')} · {t('profile.version', { version: APP_VERSION })}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1, gap: 2 },
  section: { gap: spacing.xs },
});
