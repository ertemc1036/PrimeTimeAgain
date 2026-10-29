import { fromISODate } from '@/domain/dates';
import type { ISODate } from '@/domain/types';

/** Locale-aware date formatting using the current app language (not the device locale). */
export const formatDate = (iso: ISODate, locale: string, options: Intl.DateTimeFormatOptions): string => {
  try {
    return new Intl.DateTimeFormat(locale, options).format(fromISODate(iso));
  } catch {
    return iso;
  }
};

export const formatPercent = (ratio: number, locale: string): string => {
  try {
    return new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }).format(ratio);
  } catch {
    return `${Math.round(ratio * 100)}%`;
  }
};

export const formatInteger = (n: number, locale: string): string => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(n);
