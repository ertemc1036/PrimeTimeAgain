import { useTranslation } from 'react-i18next';

import { getLanguage, isSupportedLanguage, type LanguageCode } from './languages';

/** Current app language (re-renders when it changes). */
export function useLanguage(): LanguageCode {
  const { i18n } = useTranslation();
  return isSupportedLanguage(i18n.language) ? i18n.language : 'en';
}

/** Locale for dates and numbers in the app language. English follows the device region (en-US, en-GB…). */
export function useLocale(): string {
  const lang = useLanguage();
  if (lang === 'en') {
    try {
      const device = Intl.DateTimeFormat().resolvedOptions().locale;
      if (device.startsWith('en')) return device;
    } catch {
      // fall through
    }
  }
  return getLanguage(lang).locale;
}
