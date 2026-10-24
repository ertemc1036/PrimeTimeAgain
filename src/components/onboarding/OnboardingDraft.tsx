import { createContext, useContext, useState, type ReactNode } from 'react';

import { DEFAULT_AVATAR } from '@/avatar/types';
import type { OnboardingDraft } from '@/domain/plan';
import { DEFAULT_DURATION } from '@/domain/program';

const initialDraft = (): OnboardingDraft => ({
  goalIds: [],
  customGoals: [],
  profile: { name: '', startingPoint: {} },
  durationDays: DEFAULT_DURATION,
  dailyMinutes: 30,
  avatar: { ...DEFAULT_AVATAR },
});

const DraftContext = createContext<{ draft: OnboardingDraft; update: (patch: Partial<OnboardingDraft>) => void } | null>(null);

/** Holds onboarding answers until the user finishes; nothing is saved halfway through. */
export function OnboardingDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState(initialDraft);
  return (
    <DraftContext.Provider value={{ draft, update: (patch) => setDraft((d) => ({ ...d, ...patch })) }}>
      {children}
    </DraftContext.Provider>
  );
}

export function useOnboardingDraft() {
  const ctx = useContext(DraftContext);
  if (!ctx) throw new Error('useOnboardingDraft must be used inside <OnboardingDraftProvider>');
  return ctx;
}
