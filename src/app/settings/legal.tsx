import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppText, Card, Screen } from '@/components/ui';
import { colors } from '@/theme';

export default function Legal() {
  const { t } = useTranslation();
  const { doc } = useLocalSearchParams<{ doc: 'privacy' | 'terms' | 'help' | 'contact' }>();
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
