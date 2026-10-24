/**
 * Subscription boundary (Prime Pro). Everything runs on the free tier today; no payments.
 *
 * Planned (needs approval): a RevenueCat implementation using its public SDK key. RevenueCat needs a
 * development build (not Expo Go). Server-side features (AI coach limits) verify entitlements via
 * RevenueCat webhooks stored in Supabase, never by trusting the client alone.
 */
export type Feature = 'advancedAvatar' | 'aiCoach' | 'advancedMissions' | 'analytics' | 'reports';

export interface Entitlements {
  pro: boolean;
}

export interface EntitlementService {
  getEntitlements(): Promise<Entitlements>;
}

export const FREE_FEATURES: readonly string[] = ['goals', 'basicAvatar', 'missions', 'calendar', 'basicProgress', 'journey'];

export const hasFeature = (e: Entitlements, _feature: Feature) => e.pro;

export const freeEntitlementService: EntitlementService = {
  async getEntitlements() {
    return { pro: false };
  },
};
