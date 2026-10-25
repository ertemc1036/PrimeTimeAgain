import { createContext, useContext, useState, type ReactNode } from 'react';

import type { ActivityPreference, FoodPreferences, GoalType, Units } from '@/domain/types';

export interface OnboardingDraft {
  name: string;
  adultConfirmed: boolean;
  units: Units;
  heightCm?: number;
  weightKg?: number;
  goals: GoalType[];
  goalWeightKg?: number;
  activityPrefs: ActivityPreference[];
  food: FoodPreferences;
  planningTime: string;
  notificationsEnabled: boolean;
  journeyProgram: boolean;
}

const initial = (): OnboardingDraft => ({
  name: '',
  adultConfirmed: false,
  units: 'metric',
  goals: [],
  activityPrefs: [],
  food: { preferred: [], restrictions: [], allergies: [], dislikes: [] },
  planningTime: '20:30',
  notificationsEnabled: false,
  journeyProgram: true,
});

const Ctx = createContext<{ draft: OnboardingDraft; update(patch: Partial<OnboardingDraft>): void } | null>(null);

export function OnboardingDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState(initial);
  return <Ctx.Provider value={{ draft, update: (patch) => setDraft((d) => ({ ...d, ...patch })) }}>{children}</Ctx.Provider>;
}

export function useOnboarding() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useOnboarding must be used inside the onboarding layout');
  return ctx;
}

export const ONBOARDING_STEPS = 7;
