import 'i18next';

import type en from './locales/en.json';

// Makes every `t('…')` key type-checked against the English source file.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: typeof en };
  }
}
