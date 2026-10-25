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
  /** Localised price from the store, e.g. "5,99 €". */
  price: string;
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

type CustomerInfoLike = { entitlements: { all: Record<string, { isActive: boolean; expirationDate: string | null; billingIssueDetectedAt: string | null; productIdentifier: string }> } };
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
    const plans: StorePlan[] = [];
    for (const pkg of pkgs) {
      const id: PlanId | null = pkg.packageType === 'MONTHLY' ? 'monthly' : pkg.packageType === 'ANNUAL' ? 'yearly' : null;
      if (id) plans.push({ id, price: pkg.product.priceString, pkg });
    }
    return plans.length ? plans : null;
  } catch {
    return null;
  }
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

/** Opens the store's subscription management page (cancel / change plan). */
export async function manageSubscriptions() {
  if (purchasesUnavailableReason()) return false;
  try {
    const Purchases = (await import('react-native-purchases')).default;
    await Purchases.showManageSubscriptions();
    return true;
  } catch {
    return false;
  }
}
