import { useTranslation } from 'react-i18next';

import { getLanguage, isSupportedLanguage, DEFAULT_LANGUAGE } from './languages';

/** Current language plus derived layout info (direction, whether the display font has glyphs). */
export function useLanguage() {
  const { i18n } = useTranslation();
  const code = isSupportedLanguage(i18n.resolvedLanguage) ? i18n.resolvedLanguage : DEFAULT_LANGUAGE;
  const def = getLanguage(code);
  return { code, dir: def.dir, isRTL: def.dir === 'rtl', useDisplayFont: def.script === 'latin' };
}
