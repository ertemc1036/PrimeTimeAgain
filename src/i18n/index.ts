/* eslint-disable import/no-named-as-default-member -- i18next's default export is the shared instance we configure. */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager, Platform } from 'react-native';

import { DEFAULT_LANGUAGE, getLanguage, isSupportedLanguage, LANGUAGES, matchLanguage, type LanguageCode } from './languages';
import { resources } from './resources';

const STORAGE_KEY = 'pta.language';

export const detectDeviceLanguage = (): LanguageCode => {
  try {
    return matchLanguage(getLocales().map((l) => l.languageCode ?? l.languageTag));
  } catch {
    return DEFAULT_LANGUAGE;
  }
};

// Resources are bundled, so initialisation is synchronous and the first render is already translated.
void i18n.use(initReactI18next).init({
  resources,
  lng: detectDeviceLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: LANGUAGES.map((l) => l.code),
  interpolation: { escapeValue: false }, // React already escapes output
  returnNull: false,
  initAsync: false,
});

/**
 * Align the layout direction with the language.
 * Returns true when native layout direction changed and an app restart is needed.
 */
const applyDirection = (code: LanguageCode): boolean => {
  const rtl = getLanguage(code).dir === 'rtl';
  if (Platform.OS === 'web') {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = rtl ? 'rtl' : 'ltr';
      document.documentElement.lang = code;
    }
    return false;
  }
  if (I18nManager.isRTL === rtl) return false;
  I18nManager.allowRTL(rtl);
  I18nManager.forceRTL(rtl);
  return true;
};

/** Load the user's saved choice (if any). Falls back to the detected device language. */
export async function hydrateLanguage(): Promise<void> {
  let saved: string | null = null;
  try {
    saved = await AsyncStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage unavailable: keep the device language.
  }
  const code = isSupportedLanguage(saved) ? saved : detectDeviceLanguage();
  if (i18n.language !== code) await i18n.changeLanguage(code);
  applyDirection(code);
}

/** Change and persist the app language. Resolves to true if a restart is needed for RTL/LTR. */
export async function setAppLanguage(code: LanguageCode): Promise<{ restartRequired: boolean }> {
  await i18n.changeLanguage(code);
  await AsyncStorage.setItem(STORAGE_KEY, code);
  return { restartRequired: applyDirection(code) };
}

export const currentLanguage = (): LanguageCode =>
  isSupportedLanguage(i18n.resolvedLanguage) ? i18n.resolvedLanguage : DEFAULT_LANGUAGE;

export const clearLanguagePreference = () => AsyncStorage.removeItem(STORAGE_KEY);

export default i18n;
