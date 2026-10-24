import de from './locales/de.json';
import en from './locales/en.json';
import tr from './locales/tr.json';
import type { LanguageCode } from './languages';

export const resources = {
  en: { translation: en },
  de: { translation: de },
  tr: { translation: tr },
} as const satisfies Record<LanguageCode, { translation: unknown }>;
