import type { Profile } from './types';

/**
 * Separate, explicit consent to process health data (Art. 9 GDPR – wording pending legal review,
 * see docs/HEALTH_CONSENT.md). Independent of the AI-context consent and of the terms.
 *
 * Covered ("health data" in this app): body basis for the calculation, height, weight and weight
 * history, goal weight, the answers of the health check, allergies, intolerances and special dietary
 * requirements. Without a current consent none of it is stored – the reducer drops it (data
 * minimisation) – and the app works without calorie targets and weight tracking.
 *
 * Bump the version when the consent text changes materially: accounts with an older version are
 * asked again, and are treated as "no consent" until they answer.
 */
export const HEALTH_CONSENT_VERSION = '2026-11-27';

export interface HealthConsent {
  granted: boolean;
  /** Version of the consent text the answer refers to. */
  version: string;
  /** When the answer was given (ISO). */
  at: string;
}

export const hasHealthConsent = (p: Pick<Profile, 'healthConsent'> | null | undefined): boolean =>
  !!p?.healthConsent?.granted && p.healthConsent.version === HEALTH_CONSENT_VERSION;

/** The account has answered the current version (yes or no) – otherwise it should be asked. */
export const healthConsentAnswered = (p: Pick<Profile, 'healthConsent'> | null | undefined): boolean => p?.healthConsent?.version === HEALTH_CONSENT_VERSION;

export const consentRecord = (granted: boolean, at: string): HealthConsent => ({ granted, version: HEALTH_CONSENT_VERSION, at });

/** Profile fields that hold health data (cleared on refusal or withdrawal). */
export const HEALTH_PROFILE_FIELDS = ['bodySex', 'heightCm', 'startWeightKg', 'goalWeightKg', 'healthFlags', 'targets', 'waterGoalMl'] as const;

/** The profile without any health data. Diet form (e.g. vegetarian) and dislikes stay. */
export function withoutHealthData(p: Profile): Profile {
  const next: Profile = { ...p, food: { ...p.food, allergies: [], restrictions: [] } };
  for (const k of HEALTH_PROFILE_FIELDS) delete (next as Partial<Profile>)[k];
  return next;
}

/** A profile patch reduced to what may be stored without consent. */
export function patchWithoutHealthData(patch: Partial<Profile>): Partial<Profile> {
  const next: Partial<Profile> = { ...patch };
  for (const k of HEALTH_PROFILE_FIELDS) delete next[k];
  if (next.food) next.food = { ...next.food, allergies: [], restrictions: [] };
  return next;
}
