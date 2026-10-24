/** Locale-aware upper-casing (Turkish dotted/dotless i), independent of the JS engine's Intl support. */
export function toUpper(text: string, language: string): string {
  if (language === 'tr' || language === 'az') return text.replace(/i/g, 'İ').replace(/ı/g, 'I').toUpperCase();
  return text.toUpperCase();
}
