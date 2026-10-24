import type { DailyMinutes } from '@/domain/types';

export const MINUTE_OPTIONS = [
  { value: 10, key: 'm10', icon: 'sunrise' },
  { value: 20, key: 'm20', icon: 'sun' },
  { value: 30, key: 'm30', icon: 'zap' },
] as const satisfies readonly { value: DailyMinutes; key: string; icon: string }[];
