import { useTranslation } from 'react-i18next';

import { setAppLanguage } from '@/i18n';
import type { LanguageCode } from '@/i18n/languages';
import { notify } from '@/utils/confirm';

export function useChangeLanguage() {
  const { t } = useTranslation();
  return async (code: LanguageCode) => {
    try {
      const { restartRequired } = await setAppLanguage(code);
      if (restartRequired) notify(t('language.restartTitle'), t('language.restartBody'));
    } catch {
      notify(t('states.errorTitle'), t('states.saveError'));
    }
  };
}
