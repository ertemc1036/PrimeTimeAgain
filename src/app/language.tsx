import { useTranslation } from 'react-i18next';

import { LanguageList } from '@/components/settings/LanguageList';
import { useChangeLanguage } from '@/components/settings/useChangeLanguage';
import { AppText, Screen } from '@/components/ui';
import { detectDeviceLanguage } from '@/i18n';
import { getLanguage } from '@/i18n/languages';
import { useLanguage } from '@/i18n/useLanguage';
import { colors } from '@/theme';

export default function LanguageScreen() {
  const { t } = useTranslation();
  const { code } = useLanguage();
  const changeLanguage = useChangeLanguage();

  return (
    <Screen back="close" title={t('language.title')} subtitle={t('language.subtitle')}>
      <LanguageList value={code} onChange={changeLanguage} />
      <AppText variant="caption" color={colors.textMuted} align="center">
        {`${t('language.device')}: ${getLanguage(detectDeviceLanguage()).nativeName}`}
      </AppText>
    </Screen>
  );
}
