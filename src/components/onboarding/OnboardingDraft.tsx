import { createContext, useContext, useState, type ReactNode } from 'react';

import type { DailyMinutes, GoalId, Pillar } from '@/domain/types';

export interface Draft {
  name: string;
  pillars: Pillar[];
  dailyMinutes: DailyMinutes;
  goalIds: GoalId[];
}

const DraftContext = createContext<{ draft: Draft; update: (patch: Partial<Draft>) => void } | null>(null);

/** Holds onboarding answers until the user finishes; nothing is saved halfway. */
export function OnboardingDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<Draft>({ name: '', pillars: [], dailyMinutes: 20, goalIds: [] });
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
