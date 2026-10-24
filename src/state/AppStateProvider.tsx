import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { createLocalRepository } from '@/data/localRepository';
import type { AppRepository } from '@/data/repository';
import { today as getToday } from '@/domain/dates';
import { emptyAppData, type AppData, type GoalId, type ISODate, type Preferences, type Profile, type Reflection } from '@/domain/types';

type Status = 'loading' | 'ready' | 'error';

interface AppStateValue {
  status: Status;
  data: AppData;
  /** The user's local date; refreshes when the app returns to the foreground. */
  today: ISODate;
  isOnboarded: boolean;
  /** Set when the last write failed, so screens can show a gentle error. */
  saveError: boolean;
  retryLoad(): void;
  dismissSaveError(): void;
  completeOnboarding(data: AppData): Promise<void>;
  toggleGoal(goalId: GoalId, date?: ISODate): void;
  updateProfile(profile: Profile): Promise<void>;
  updateGoals(goalIds: GoalId[]): Promise<void>;
  addReflection(reflection: Omit<Reflection, 'id' | 'createdAt'>): Promise<void>;
  updatePreferences(preferences: Preferences): void;
  resetAll(): Promise<void>;
}

const AppStateContext = createContext<AppStateValue | null>(null);

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function AppStateProvider({
  children,
  repository: injected,
}: {
  children: ReactNode;
  repository?: AppRepository;
}) {
  const repository = useRef(injected ?? createLocalRepository()).current;
  const [status, setStatus] = useState<Status>('loading');
  const [data, setData] = useState<AppData>(emptyAppData);
  const [today, setToday] = useState(getToday);
  const [saveError, setSaveError] = useState(false);

  const fetchData = useCallback(
    () =>
      repository
        .load()
        .then((loaded) => {
          setData(loaded);
          setStatus('ready');
        })
        .catch(() => setStatus('error')),
    [repository],
  );

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const retryLoad = useCallback(() => {
    setStatus('loading');
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s === 'active' && setToday(getToday()));
    return () => sub.remove();
  }, []);

  /** Optimistic update: change the UI immediately, persist in the background, flag failures. */
  const persist = useCallback(
    (update: (d: AppData) => AppData, save: () => Promise<void>) => {
      setData(update);
      return save().catch((e: unknown) => {
        setSaveError(true);
        throw e;
      });
    },
    [],
  );

  const value = useMemo<AppStateValue>(
    () => ({
      status,
      data,
      today,
      isOnboarded: !!data.profile,
      saveError,
      retryLoad,
      dismissSaveError: () => setSaveError(false),
      completeOnboarding: (next) => persist(() => next, () => repository.replaceAll(next)),
      toggleGoal: (goalId, date = today) => {
        const done = !(data.log[date] ?? []).includes(goalId);
        persist(
          (d) => {
            const set = new Set(d.log[date] ?? []);
            if (done) set.add(goalId);
            else set.delete(goalId);
            return { ...d, log: { ...d.log, [date]: [...set] } };
          },
          () => repository.setCompletion(date, goalId, done),
        ).catch(() => undefined);
      },
      updateProfile: (profile) => persist((d) => ({ ...d, profile }), () => repository.saveProfile(profile)),
      updateGoals: (goalIds) => persist((d) => ({ ...d, goalIds }), () => repository.saveGoals(goalIds)),
      addReflection: (input) => {
        const reflection: Reflection = { ...input, id: newId(), createdAt: new Date().toISOString() };
        return persist(
          (d) => ({ ...d, reflections: [reflection, ...d.reflections] }),
          () => repository.addReflection(reflection),
        );
      },
      updatePreferences: (preferences) => {
        persist((d) => ({ ...d, preferences }), () => repository.savePreferences(preferences)).catch(() => undefined);
      },
      resetAll: async () => {
        await repository.reset();
        setData(emptyAppData());
      },
    }),
    [status, data, today, saveError, retryLoad, persist, repository],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used inside <AppStateProvider>');
  return ctx;
}
