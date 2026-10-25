/** Supported app languages. To add one: create `locales/<code>.json` (same keys as en.json) and add an entry. */
export interface LanguageDefinition {
  code: string;
  /** Name in the language itself, shown in the picker. */
  nativeName: string;
  englishName: string;
  /** Locale used for dates and numbers. */
  locale: string;
}

export const LANGUAGES = [
  { code: 'en', nativeName: 'English', englishName: 'English', locale: 'en-GB' },
  { code: 'de', nativeName: 'Deutsch', englishName: 'German', locale: 'de-DE' },
  { code: 'tr', nativeName: 'Türkçe', englishName: 'Turkish', locale: 'tr-TR' },
  { code: 'es', nativeName: 'Español', englishName: 'Spanish', locale: 'es-ES' },
  { code: 'fr', nativeName: 'Français', englishName: 'French', locale: 'fr-FR' },
] as const satisfies readonly LanguageDefinition[];

export type LanguageCode = (typeof LANGUAGES)[number]['code'];
export const DEFAULT_LANGUAGE: LanguageCode = 'en';

export const isSupportedLanguage = (code: string | null | undefined): code is LanguageCode => !!code && LANGUAGES.some((l) => l.code === code);

export const getLanguage = (code: string) => LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];

/** First supported language from the device's preferred list, else English. */
export const matchLanguage = (preferred: readonly (string | null | undefined)[]): LanguageCode => {
  for (const tag of preferred) {
    const base = tag?.toLowerCase().split(/[-_]/)[0];
    if (isSupportedLanguage(base)) return base;
  }
  return DEFAULT_LANGUAGE;
};
