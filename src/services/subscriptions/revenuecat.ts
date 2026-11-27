import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

import { env } from '@/config/env';

import { fromRevenueCat, PRODUCTS, type Entitlement } from './entitlements';

/**
 * RevenueCat (App Store / Google Play subscriptions).
 * Real purchases need the installed app (development, preview or store build): Expo Go and the
 * web can't talk to StoreKit / Play Billing, so purchases are not offered there.
 * The app user id is the Supabase user id, so Pro follows the account across devices; the server
 * verifies it independently (webhook + REST) before any AI request.
 */
export type PlanId = 'monthly' | 'yearly';
export interface StorePlan {
  id: PlanId;
  productId: string;
  /** Localised price from the store, e.g. "9,99 €" – the only price the app ever shows. */
  price: string;
  /** Numeric store price and currency, for the per-month value and the saving (never shown alone). */
  amount: number;
  currency: string;
  /**
   * Free trial the store will actually apply to this account (configured in App Store Connect AND the
   * account is eligible according to Apple). Null otherwise – then no trial is mentioned anywhere.
   */
  freeTrial: { count: number; unit: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' } | null;
  pkg: unknown;
}
export type PurchaseOutcome = { ok: true; entitlement: Entitlement } | { ok: false; reason: 'cancelled' | 'not_supported' | 'not_configured' | 'pending' | 'failed' };

const apiKey = () => (Platform.OS === 'ios' ? env.revenueCatIosKey : Platform.OS === 'android' ? env.revenueCatAndroidKey : '');
const inExpoGo = () => Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/** Why purchases can't run here, or null when they can. */
export function purchasesUnavailableReason(): 'not_supported' | 'not_configured' | null {
  if (Platform.OS === 'web' || inExpoGo()) return 'not_supported';
  if (!apiKey()) return 'not_configured';
  return null;
}

type PurchasesModule = typeof import('react-native-purchases').default;
let configuredFor: string | null | undefined;
async function sdk(userId: string | null): Promise<PurchasesModule | null> {
  if (purchasesUnavailableReason()) return null;
  const Purchases = (await import('react-native-purchases')).default;
  if (configuredFor === undefined) {
    Purchases.configure({ apiKey: apiKey(), appUserID: userId ?? undefined });
    configuredFor = userId;
  } else if (userId && configuredFor !== userId) {
    await Purchases.logIn(userId);
    configuredFor = userId;
  } else if (!userId && configuredFor) {
    await Purchases.logOut().catch(() => undefined);
    configuredFor = null;
  }
  return Purchases;
}

type CustomerInfoLike = {
  entitlements: { all: Record<string, { isActive: boolean; expirationDate: string | null; billingIssueDetectedAt: string | null; productIdentifier: string; willRenew?: boolean; periodType?: string }> };
};
export const entitlementFromCustomerInfo = (info: CustomerInfoLike | null | undefined): Entitlement => fromRevenueCat(info?.entitlements.all[PRODUCTS.entitlement]);

/** Keep RevenueCat's user in step with the signed-in account; returns the current entitlement. */
export async function identify(userId: string | null): Promise<Entitlement | null> {
  try {
    const p = await sdk(userId);
    if (!p) return null;
    return entitlementFromCustomerInfo(await p.getCustomerInfo());
  } catch {
    return null;
  }
}

export async function onCustomerInfo(fn: (e: Entitlement) => void): Promise<() => void> {
  if (purchasesUnavailableReason()) return () => undefined;
  const Purchases = (await import('react-native-purchases')).default;
  const listener = (info: CustomerInfoLike) => fn(entitlementFromCustomerInfo(info));
  Purchases.addCustomerInfoUpdateListener(listener as never);
  return () => Purchases.removeCustomerInfoUpdateListener(listener as never);
}

/** Monthly and yearly packages of the current offering, with store-localised prices. */
export async function loadPlans(userId: string | null): Promise<StorePlan[] | null> {
  try {
    const p = await sdk(userId);
    if (!p) return null;
    const offerings = await p.getOfferings();
    const pkgs = offerings.current?.availablePackages ?? [];
    const found = pkgs
      .map((pkg) => ({ pkg, id: (pkg.packageType === 'MONTHLY' ? 'monthly' : pkg.packageType === 'ANNUAL' ? 'yearly' : null) as PlanId | null }))
      .filter((x): x is { pkg: (typeof pkgs)[number]; id: PlanId } => !!x.id);
    if (!found.length) return null;
    // A trial is only mentioned when the store has one AND Apple says this account may use it.
    let eligible: Record<string, { status: number }> = {};
    const withTrial = found.filter((f) => f.pkg.product.introPrice?.price === 0).map((f) => f.pkg.product.identifier);
    if (withTrial.length) eligible = await p.checkTrialOrIntroductoryPriceEligibility(withTrial).catch(() => ({}));
    return found.map(({ pkg, id }) => {
      const intro = pkg.product.introPrice;
      const trialOk = !!intro && intro.price === 0 && eligible[pkg.product.identifier]?.status === TRIAL_ELIGIBLE;
      return {
        id,
        productId: pkg.product.identifier,
        price: pkg.product.priceString,
        amount: pkg.product.price,
        currency: pkg.product.currencyCode,
        freeTrial: trialOk ? { count: intro.periodNumberOfUnits, unit: intro.periodUnit as 'DAY' } : null,
        pkg,
      };
    });
  } catch {
    return null;
  }
}

/** INTRO_ELIGIBILITY_STATUS_ELIGIBLE in RevenueCat's SDK. */
const TRIAL_ELIGIBLE = 2;

/**
 * Per-month value of the yearly plan and the saving against twelve monthly payments, from the real
 * store prices (same currency only). Null when it can't be computed honestly.
 */
export function yearlySaving(monthly: Pick<StorePlan, 'amount' | 'currency'> | undefined, yearly: Pick<StorePlan, 'amount' | 'currency'> | undefined) {
  if (!monthly || !yearly || monthly.currency !== yearly.currency || monthly.amount <= 0 || yearly.amount <= 0) return null;
  const twelve = monthly.amount * 12;
  if (yearly.amount >= twelve) return null;
  return { perMonth: yearly.amount / 12, saved: twelve - yearly.amount, percent: Math.floor(((twelve - yearly.amount) / twelve) * 100) };
}

export async function purchase(userId: string, plan: StorePlan): Promise<PurchaseOutcome> {
  const reason = purchasesUnavailableReason();
  if (reason) return { ok: false, reason };
  try {
    const p = (await sdk(userId))!;
    const res = await p.purchasePackage(plan.pkg as never);
    return { ok: true, entitlement: entitlementFromCustomerInfo(res.customerInfo) };
  } catch (e) {
    const err = e as { userCancelled?: boolean; code?: string };
    if (err.userCancelled) return { ok: false, reason: 'cancelled' };
    if (err.code === 'PAYMENT_PENDING_ERROR' || err.code === '20') return { ok: false, reason: 'pending' };
    return { ok: false, reason: 'failed' };
  }
}

export async function restore(userId: string | null): Promise<PurchaseOutcome> {
  const reason = purchasesUnavailableReason();
  if (reason) return { ok: false, reason };
  try {
    const p = (await sdk(userId))!;
    return { ok: true, entitlement: entitlementFromCustomerInfo(await p.restorePurchases()) };
  } catch {
    return { ok: false, reason: 'failed' };
  }
}

/** Apple's / Google's own subscription pages (work everywhere, also without the SDK). */
export const STORE_SUBSCRIPTIONS_URL = Platform.OS === 'android' ? 'https://play.google.com/store/account/subscriptions' : 'https://apps.apple.com/account/subscriptions';

/** Opens the store's subscription management page (cancel / change plan). */
export async function manageSubscriptions() {
  if (!purchasesUnavailableReason()) {
    try {
      const Purchases = (await import('react-native-purchases')).default;
      await Purchases.showManageSubscriptions();
      return true;
    } catch {
      // fall through to the store's web page
    }
  }
  try {
    const { openURL } = await import('expo-linking');
    await openURL(STORE_SUBSCRIPTIONS_URL);
    return true;
  } catch {
    return false;
  }
}
