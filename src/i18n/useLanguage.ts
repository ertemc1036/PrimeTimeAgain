/** Locale used for date and number formatting (English, but respects the device's region). */
export function useLocale(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale.startsWith('en') ? Intl.DateTimeFormat().resolvedOptions().locale : 'en-GB';
  } catch {
    return 'en-GB';
  }
}
