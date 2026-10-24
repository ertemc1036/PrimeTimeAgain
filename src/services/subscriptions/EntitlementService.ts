/**
 * Subscription boundary. The free tier is all we have today.
 * A RevenueCat implementation will plug in here (it needs a development build, not Expo Go).
 * Anything that must be secure (e.g. AI coaching limits) is enforced server-side as well.
 */
export interface Entitlements {
  plus: boolean;
}

export interface EntitlementService {
  getEntitlements(): Promise<Entitlements>;
}

export const freeEntitlementService: EntitlementService = {
  async getEntitlements() {
    return { plus: false };
  },
};
