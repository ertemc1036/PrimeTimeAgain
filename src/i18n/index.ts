/* eslint-disable import/no-named-as-default-member -- i18next's default export is the shared instance. */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { DEFAULT_LANGUAGE } from './languages';
import { resources } from './resources';

// Resources are bundled, so initialisation is synchronous.
void i18n.use(initReactI18next).init({
  resources,
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: { escapeValue: false },
  returnNull: false,
  initAsync: false,
});

export default i18n;
