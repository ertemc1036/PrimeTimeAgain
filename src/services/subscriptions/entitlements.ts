/**
 * Free / Pro entitlements.
 *
 * Source of truth in production: RevenueCat (store receipts) → webhook → `subscription_entitlements`
 * table in Supabase. Edge Functions re-check that table on every AI request, so the client can never
 * grant itself Pro. The app reads the entitlement only to decide what to show.
 *
 * RevenueCat's SDK (react-native-purchases) needs a development build; it is not installed yet.
 */
export type EntitlementStatus = 'active' | 'grace_period' | 'billing_issue' | 'expired' | 'none';

export interface Entitlement {
  tier: 'free' | 'pro';
  status: EntitlementStatus;
  source: 'none' | 'revenuecat' | 'dev_preview';
  expiresAt?: string;
  productId?: string;
}

export const FREE: Entitlement = { tier: 'free', status: 'none', source: 'none' };

/** Minimal shape of RevenueCat's CustomerInfo entitlement we rely on (kept SDK-agnostic for tests). */
export interface RevenueCatEntitlementInfo {
  isActive: boolean;
  expirationDate: string | null;
  billingIssueDetectedAt: string | null;
  productIdentifier: string;
  periodType?: string;
  willRenew?: boolean;
}

/** Map RevenueCat's "pro" entitlement to our model. Grace periods keep access; expiry removes it. */
export function fromRevenueCat(info: RevenueCatEntitlementInfo | undefined, now = new Date()): Entitlement {
  if (!info) return FREE;
  const expired = info.expirationDate ? new Date(info.expirationDate) <= now : false;
  if (info.isActive && !expired) {
    return {
      tier: 'pro',
      status: info.billingIssueDetectedAt ? 'grace_period' : 'active',
      source: 'revenuecat',
      expiresAt: info.expirationDate ?? undefined,
      productId: info.productIdentifier,
    };
  }
  return {
    tier: 'free',
    status: info.billingIssueDetectedAt ? 'billing_issue' : 'expired',
    source: 'revenuecat',
    expiresAt: info.expirationDate ?? undefined,
    productId: info.productIdentifier,
  };
}

export const isPro = (e: Entitlement) => e.tier === 'pro';

export const PRODUCTS = {
  monthly: 'minus30_pro_monthly',
  yearly: 'minus30_pro_yearly',
  entitlement: 'pro',
} as const;
