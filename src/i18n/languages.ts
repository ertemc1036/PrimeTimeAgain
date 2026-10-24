/**
 * Language registry. To add a language: create `locales/<code>.json` and add one entry here.
 * `script` decides whether the Latin display font can be used; other scripts use the system font.
 */
export type TextDirection = 'ltr' | 'rtl';
export type Script = 'latin' | 'arabic' | 'hebrew' | 'cyrillic' | 'cjk' | 'other';

export interface LanguageDefinition {
  code: string;
  /** Name in the language itself, shown in the picker. */
  nativeName: string;
  /** Name in English, used for accessibility and support. */
  englishName: string;
  dir: TextDirection;
  script: Script;
}

export const LANGUAGES = [
  { code: 'en', nativeName: 'English', englishName: 'English', dir: 'ltr', script: 'latin' },
  { code: 'de', nativeName: 'Deutsch', englishName: 'German', dir: 'ltr', script: 'latin' },
  { code: 'tr', nativeName: 'Türkçe', englishName: 'Turkish', dir: 'ltr', script: 'latin' },
] as const satisfies readonly LanguageDefinition[];

/**
 * Prepared but NOT available: these appear in the picker only after a complete, reviewed translation
 * exists and the screens have been checked for layout (RTL for Arabic). Moving an entry into
 * LANGUAGES (and adding locales/<code>.json) is all that's needed.
 */
export const PLANNED_LANGUAGES: readonly LanguageDefinition[] = [
  { code: 'es', nativeName: 'Español', englishName: 'Spanish', dir: 'ltr', script: 'latin' },
  { code: 'fr', nativeName: 'Français', englishName: 'French', dir: 'ltr', script: 'latin' },
  { code: 'pt', nativeName: 'Português', englishName: 'Portuguese', dir: 'ltr', script: 'latin' },
  { code: 'it', nativeName: 'Italiano', englishName: 'Italian', dir: 'ltr', script: 'latin' },
  { code: 'ar', nativeName: 'العربية', englishName: 'Arabic', dir: 'rtl', script: 'arabic' },
  { code: 'hi', nativeName: 'हिन्दी', englishName: 'Hindi', dir: 'ltr', script: 'other' },
  { code: 'ja', nativeName: '日本語', englishName: 'Japanese', dir: 'ltr', script: 'cjk' },
  { code: 'ko', nativeName: '한국어', englishName: 'Korean', dir: 'ltr', script: 'cjk' },
  { code: 'zh', nativeName: '中文', englishName: 'Chinese', dir: 'ltr', script: 'cjk' },
  { code: 'id', nativeName: 'Bahasa Indonesia', englishName: 'Indonesian', dir: 'ltr', script: 'latin' },
];

export type LanguageCode = (typeof LANGUAGES)[number]['code'];

export const DEFAULT_LANGUAGE: LanguageCode = 'en';

export const isSupportedLanguage = (code: string | null | undefined): code is LanguageCode =>
  !!code && LANGUAGES.some((l) => l.code === code);

export const getLanguage = (code: string): LanguageDefinition =>
  LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];

/** Pick the first supported language from the device's preferred list, else English. */
export const matchLanguage = (preferred: readonly (string | null | undefined)[]): LanguageCode => {
  for (const tag of preferred) {
    const base = tag?.toLowerCase().split(/[-_]/)[0];
    if (isSupportedLanguage(base)) return base;
  }
  return DEFAULT_LANGUAGE;
};
