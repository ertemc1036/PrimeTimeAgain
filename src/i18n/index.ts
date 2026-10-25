/* eslint-disable import/no-named-as-default-member -- i18next's default export is the shared instance. */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { Platform } from 'react-native';

import { DEFAULT_LANGUAGE, isSupportedLanguage, LANGUAGES, matchLanguage, type LanguageCode } from './languages';
import { resources } from './resources';

const STORAGE_KEY = 'm30.language';

export const detectDeviceLanguage = (): LanguageCode => {
  try {
    return matchLanguage(getLocales().map((l) => l.languageCode ?? l.languageTag));
  } catch {
    return DEFAULT_LANGUAGE;
  }
};

const setDocumentLang = (code: string) => {
  if (Platform.OS === 'web' && typeof document !== 'undefined') document.documentElement.lang = code;
};

// Resources are bundled, so the first render is already in the device language.
void i18n.use(initReactI18next).init({
  resources,
  lng: detectDeviceLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: LANGUAGES.map((l) => l.code),
  interpolation: { escapeValue: false },
  returnNull: false,
  initAsync: false,
});

/** Apply the user's saved choice, if any (otherwise the device language stays). */
export async function hydrateLanguage(): Promise<void> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (isSupportedLanguage(saved) && saved !== i18n.language) await i18n.changeLanguage(saved);
  } catch {
    // Storage unavailable: keep the device language.
  }
  setDocumentLang(i18n.language);
}

/** Change and remember the app language. */
export async function setLanguage(code: LanguageCode): Promise<void> {
  await i18n.changeLanguage(code);
  setDocumentLang(code);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, code);
  } catch {
    // The change still applies for this session.
  }
}

export const currentLanguage = (): LanguageCode => (isSupportedLanguage(i18n.language) ? i18n.language : DEFAULT_LANGUAGE);

export default i18n;
