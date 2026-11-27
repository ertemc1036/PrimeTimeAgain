import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import type { BodySex, Pace, PrimaryGoal, WorkoutsPerWeek } from '@/domain/plan';
import type { Units } from '@/domain/types';

import { clearDraft, loadDraft, saveDraft } from './storage';

/** All answers of the onboarding, kept in one place and stored encrypted until the account exists. */
export interface OnboardingDraft {
  step: StepId;
  name: string;
  bodySex?: BodySex | 'skip';
  workouts?: WorkoutsPerWeek;
  birth?: { year: number; month: number; day: number };
  referral?: string;
  triedOtherApps?: boolean;
  units: Units;
  heightCm: number;
  weightKg: number;
  hasCoach?: boolean;
  goal?: PrimaryGoal;
  goalWeightKg?: number;
  pace: Pace;
  challenges: string[];
  diet?: string;
  dietNeeds: string[];
  motivations: string[];
  coachConsent: boolean;
}

/**
 * The screens in order (references 01–27 of the brief; a name step is added because Prime and the
 * account need it, and the diet needs get their own compact step instead of one long list).
 */
export const STEPS = [
  'welcome',
  'name',
  'body',
  'workouts',
  'birth',
  'referral',
  'apps',
  'intro',
  'height',
  'weight',
  'coach',
  'goal',
  'goalWeight',
  'goalMessage',
  'pace',
  'companion',
  'challenges',
  'diet',
  'dietNeeds',
  'motivations',
  'milestones',
  'thanks',
  'loading',
  'plan',
  'nutrition',
  'routine',
  'beta',
  'account',
  'done',
] as const;
export type StepId = (typeof STEPS)[number];

/** Steps without the progress header (full-screen moments). */
export const NO_HEADER: readonly StepId[] = ['welcome', 'loading', 'done'];

/** The beta screen exists only while the server gives everyone PrimeMe+ (EXPO_PUBLIC_BETA_ALL_USERS_PRO=1, see eas.json). */
export const BETA_SCREEN = process.env.EXPO_PUBLIC_BETA_ALL_USERS_PRO === '1';

export function isVisible(id: StepId, d: OnboardingDraft): boolean {
  if (id === 'goalWeight' || id === 'pace') return d.goal === 'lose';
  if (id === 'beta') return BETA_SCREEN;
  return true;
}

export const initialDraft = (): OnboardingDraft => ({
  step: 'welcome',
  name: '',
  units: 'metric',
  heightCm: 170,
  weightKg: 75,
  pace: 'balanced',
  challenges: [],
  dietNeeds: [],
  motivations: [],
  coachConsent: false,
});

interface Ctx {
  draft: OnboardingDraft;
  ready: boolean;
  /** +1 forward, −1 back (for the slide direction). */
  direction: 1 | -1;
  update(patch: Partial<OnboardingDraft>): void;
  next(): void;
  back(): void;
  goTo(step: StepId): void;
  /** Position of the current step among the visible steps (for the progress bar). */
  progress: number;
  reset(): Promise<void>;
}

const OnboardingContext = createContext<Ctx | null>(null);

export function OnboardingStateProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<OnboardingDraft>(initialDraft);
  const [ready, setReady] = useState(false);
  const [direction, setDirection] = useState<1 | -1>(1);
  const loaded = useRef(false);

  // Resume an interrupted onboarding (the loading screen restarts from the thanks screen).
  useEffect(() => {
    void loadDraft<OnboardingDraft>().then((saved) => {
      if (saved && STEPS.includes(saved.step)) setDraft({ ...initialDraft(), ...saved, step: saved.step === 'loading' ? 'thanks' : saved.step });
      loaded.current = true;
      setReady(true);
    });
  }, []);
  useEffect(() => {
    if (loaded.current) void saveDraft(draft);
  }, [draft]);

  const move = useCallback((dir: 1 | -1) => {
    setDirection(dir);
    setDraft((d) => {
      let i = STEPS.indexOf(d.step) + dir;
      while (i > 0 && i < STEPS.length - 1 && !isVisible(STEPS[i], d)) i += dir;
      return { ...d, step: STEPS[Math.max(0, Math.min(STEPS.length - 1, i))] };
    });
  }, []);

  const value = useMemo<Ctx>(() => {
    const visible = STEPS.filter((s) => isVisible(s, draft) && !NO_HEADER.includes(s));
    const pos = visible.indexOf(draft.step);
    return {
      draft,
      ready,
      direction,
      update: (patch) => setDraft((d) => ({ ...d, ...patch })),
      next: () => move(1),
      back: () => move(-1),
      goTo: (step) => {
        setDirection(STEPS.indexOf(step) > STEPS.indexOf(draft.step) ? 1 : -1);
        setDraft((d) => ({ ...d, step }));
      },
      progress: pos < 0 ? 1 : (pos + 1) / visible.length,
      reset: async () => {
        await clearDraft();
        setDirection(-1);
        setDraft(initialDraft());
      },
    };
  }, [draft, ready, direction, move]);

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboardingFlow(): Ctx {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboardingFlow must be used inside OnboardingStateProvider');
  return ctx;
}
