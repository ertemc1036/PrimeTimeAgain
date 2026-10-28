import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppText, Card, Screen } from '@/components/ui';
import { THIRD_PARTY_NOTICES } from '@/config/licenses';
import { colors } from '@/theme';

export default function Legal() {
  const { t } = useTranslation();
  const { doc } = useLocalSearchParams<{ doc: 'privacy' | 'terms' | 'help' | 'contact' | 'licenses' }>();
  if (doc === 'licenses') {
    return (
      <Screen back="back" title={t('about.licenses')} subtitle={t('about.licensesIntro')}>
        {THIRD_PARTY_NOTICES.map((n) => (
          <Card key={n.name}>
            <AppText variant="bodyStrong">{n.name}</AppText>
            <AppText variant="caption" color="secondary">
              {n.url}
            </AppText>
            <AppText variant="caption">{n.license}</AppText>
          </Card>
        ))}
      </Screen>
    );
  }
  const content =
    doc === 'privacy'
      ? { title: t('about.privacyTitle'), body: t('about.privacyBody'), draft: true }
      : doc === 'terms'
        ? { title: t('about.termsTitle'), body: t('about.termsBody'), draft: true }
        : doc === 'contact'
          ? { title: t('about.contact'), body: t('about.noContact'), draft: false }
          : { title: t('profile.help'), body: t('about.help'), draft: false };
  return (
    <Screen back="back" title={content.title}>
      {content.draft ? (
        <Card variant="inverse">
          <AppText variant="bodyStrong" color={colors.white}>
            {t('about.draft')}
          </AppText>
        </Card>
      ) : null}
      <AppText variant="body">{content.body}</AppText>
      <AppText variant="caption" color="secondary">
        {t('about.medical')}
      </AppText>
    </Screen>
  );
}
