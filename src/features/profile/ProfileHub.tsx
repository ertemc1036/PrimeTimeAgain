import { router, type Href } from 'expo-router';
import { Linking, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Card, ListRow, ProBadge, Screen, type IconName } from '@/components/ui';
import { APP_VERSION } from '@/config/app';
import { env } from '@/config/env';
import { openLegal } from '@/features/legal';
import { ProTestModeCard } from '@/features/profile/ProTestModeCard';
import { getLanguage } from '@/i18n/languages';
import { useLanguage } from '@/i18n/useLanguage';
import { useAppState } from '@/state/AppStateProvider';
import { useAuth } from '@/state/AuthProvider';
import { usePro } from '@/state/ProProvider';
import { colors, fonts, spacing } from '@/theme';
import { membershipKey, membershipOf } from '@/features/pro/membership';
import { manageSubscriptions } from '@/services/subscriptions/revenuecat';

type Row = { label: string; icon: IconName; href?: Href; onPress?: () => void; value?: string };

/** Profile hub: shown as the Profile tab and as /settings (stack, with back button). */
export function ProfileHub({ inTabs }: { inTabs?: boolean }) {
  const { t } = useTranslation();
  const { data } = useAppState();
  const pro = usePro();
  const { isPro } = pro;
  const membership = t(membershipKey(membershipOf(pro)));
  const p = data.profile;
  const n = data.notifications;
  const lang = useLanguage();
  const auth = useAuth();

  const sections: { title: string; rows: Row[] }[] = [
    {
      title: t('profile.groups.me'),
      rows: [
        { label: t('profile.sections.personal'), icon: 'person-outline', href: { pathname: '/settings/health', params: { section: 'personal' } } },
        { label: t('profile.sections.goals'), icon: 'flag-outline', href: { pathname: '/settings/health', params: { section: 'goals' } } },
        { label: t('profile.sections.nutrition'), icon: 'restaurant-outline', href: { pathname: '/settings/health', params: { section: 'nutrition' } } },
        { label: t('profile.eatingWindow'), icon: 'time-outline', href: '/settings/eating-window', value: data.eatingWindow.enabled ? `${data.eatingWindow.start}–${data.eatingWindow.end}` : t('common.off') },
        { label: t('profile.sections.training'), icon: 'barbell-outline', href: { pathname: '/settings/health', params: { section: 'training' } } },
        { label: t('profile.progress'), icon: 'trending-up-outline', href: '/journey' },
      ],
    },
    {
      title: t('brand.agent'),
      rows: [
        { label: t('prime.memory.title'), icon: 'bookmark-outline', href: '/memories', value: String(data.memories.length) },
        { label: t('prime.log.title'), icon: 'list-outline', href: '/prime-log' },
      ],
    },
    {
      title: t('profile.groups.general'),
      rows: [
        { label: t('profile.notifications'), icon: 'notifications-outline', href: '/settings/notifications', value: n.enabled ? t(`notifications.modes.${n.mode}.title`) : t('common.off') },
        { label: t('profile.language'), icon: 'globe-outline', href: '/language', value: getLanguage(lang).nativeName },
        { label: t('onboarding.profile.units'), icon: 'resize-outline', href: { pathname: '/settings/health', params: { section: 'personal' } }, value: p?.units === 'imperial' ? 'lb, ft' : 'kg, cm' },
      ],
    },
    {
      title: t('brand.plus'),
      rows: [
        { label: isPro ? t('membership.status') : t('profile.upgrade'), icon: 'star-outline', href: '/pro', value: membership },
        { label: t('pro.manage'), icon: 'card-outline', onPress: () => void manageSubscriptions() },
        { label: t('pro.restore'), icon: 'refresh-outline', href: { pathname: '/pro', params: { restore: '1' } } },
      ],
    },
    {
      title: t('profile.groups.support'),
      rows: [
        { label: t('profile.help'), icon: 'help-circle-outline', onPress: () => router.push({ pathname: '/settings/legal', params: { doc: 'help' } }) },
        { label: t('profile.contact'), icon: 'mail-outline', onPress: () => (env.supportEmail ? void Linking.openURL(`mailto:${env.supportEmail}`) : router.push({ pathname: '/settings/legal', params: { doc: 'contact' } })) },
        { label: t('privacy.title'), icon: 'shield-checkmark-outline', href: '/settings/privacy' },
        { label: t('profile.privacyPolicy'), icon: 'document-text-outline', onPress: () => openLegal('privacy') },
        { label: t('profile.terms'), icon: 'document-outline', onPress: () => openLegal('terms') },
        { label: t('about.licenses'), icon: 'ribbon-outline', onPress: () => router.push({ pathname: '/settings/legal', params: { doc: 'licenses' } }) },
      ],
    },
    {
      title: t('profile.account'),
      rows: [
        { label: t('account.title'), icon: 'person-circle-outline', href: '/settings/account', value: auth.configured ? (auth.user?.email ?? t('account.notSignedIn')) : undefined },
        { label: t('privacy.export'), icon: 'download-outline', href: '/settings/privacy' },
        ...(auth.status === 'signedIn'
          ? [
              { label: t('account.signOut'), icon: 'log-out-outline' as const, href: '/settings/account' as const },
              { label: t('account.delete'), icon: 'trash-outline' as const, href: '/settings/account' as const },
            ]
          : []),
      ],
    },
  ];

  return (
    <Screen back={inTabs ? undefined : 'back'} inTabs={inTabs} title={t('profile.title')}>
      <Card style={styles.header}>
        <View style={styles.initial} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <AppText variant="heading" color={colors.white} style={styles.initialText}>
            {(p?.name?.trim()[0] ?? '·').toUpperCase()}
          </AppText>
        </View>
        <View style={styles.flex}>
          <AppText variant="heading">{p?.name}</AppText>
          <AppText variant="caption" color="secondary">
            {membership}
          </AppText>
        </View>
        {isPro ? <ProBadge label={t('common.pro')} /> : null}
      </Card>
      {sections.map((s) => (
        <View key={s.title} style={styles.section}>
          <AppText variant="overline" color="secondary">
            {s.title}
          </AppText>
          <Card padded={false}>
            {s.rows.map((r, i) => (
              <ListRow key={r.label} label={r.label} icon={r.icon} value={r.value} onPress={r.onPress ?? (() => r.href && router.push(r.href))} divider={i < s.rows.length - 1} />
            ))}
          </Card>
        </View>
      ))}
      <ProTestModeCard />
      <AppText variant="caption" color="secondary" align="center">
        {t('brand.name')} · {t('profile.version', { version: APP_VERSION })}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  initial: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.black, alignItems: 'center', justifyContent: 'center' },
  initialText: { fontFamily: fonts.bold },
  flex: { flex: 1, gap: 2 },
  section: { gap: spacing.xs },
});

