/**
 * MINUS 30 ships in English only (product requirement). The registry is kept so another language
 * can be added later by adding `locales/<code>.json` and an entry here.
 */
export type TextDirection = 'ltr' | 'rtl';

export interface LanguageDefinition {
  code: string;
  nativeName: string;
  dir: TextDirection;
}

export const LANGUAGES = [{ code: 'en', nativeName: 'English', dir: 'ltr' }] as const satisfies readonly LanguageDefinition[];
export type LanguageCode = (typeof LANGUAGES)[number]['code'];
export const DEFAULT_LANGUAGE: LanguageCode = 'en';
