import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { OptionCard, Screen } from '@/components/ui';
import { setLanguage } from '@/i18n';
import { LANGUAGES } from '@/i18n/languages';
import { useLanguage } from '@/i18n/useLanguage';

export default function LanguageScreen() {
  const { t } = useTranslation();
  const current = useLanguage();
  return (
    <Screen back="close" title={t('language.title')} subtitle={t('language.subtitle')}>
      {LANGUAGES.map((l) => (
        <OptionCard
          key={l.code}
          title={l.nativeName}
          subtitle={l.code === 'en' ? undefined : l.englishName}
          selected={current === l.code}
          onPress={() => {
            void setLanguage(l.code).then(() => (router.canGoBack() ? router.back() : router.replace('/')));
          }}
        />
      ))}
    </Screen>
  );
}
