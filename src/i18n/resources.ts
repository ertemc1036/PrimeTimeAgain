import de from './locales/de.json';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import tr from './locales/tr.json';

export const resources = {
  en: { translation: en },
  de: { translation: de },
  tr: { translation: tr },
  es: { translation: es },
  fr: { translation: fr },
} as const;
