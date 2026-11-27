import type { usePro } from '@/state/ProProvider';

/** What the account has right now, as shown in Profile and on the PrimeMe+ screen. */
export type Membership = 'free' | 'beta' | 'monthly' | 'yearly' | 'plus' | 'founder' | 'test';

export function membershipOf(pro: Pick<ReturnType<typeof usePro>, 'isPro' | 'access' | 'subscription'>): Membership {
  if (!pro.isPro) return 'free';
  if (pro.access === 'beta' || pro.access === 'founder' || pro.access === 'test') return pro.access;
  return pro.subscription?.plan ?? 'plus';
}

/** i18n key of the membership name ("PrimeMe Free", "PrimeMe+ Beta", "PrimeMe+ Yearly", …). */
export const membershipKey = (m: Membership) => `membership.${m}` as const;
