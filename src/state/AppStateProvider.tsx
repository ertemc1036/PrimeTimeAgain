import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { createLocalRepository } from '@/data/localRepository';
import type { AppRepository } from '@/data/repository';
import { newlyEarned } from '@/domain/achievements';
import { today as getToday } from '@/domain/dates';
import { applyMutation, MutationRejected, type Mutation, type RejectReason } from '@/domain/mutations';
import { emptyAppData, type Achievement, type AppData, type ISODate } from '@/domain/types';

type Status = 'loading' | 'ready' | 'error';
export type DispatchResult = { ok: true; earned: Achievement[] } | { ok: false; reason: RejectReason | 'save' };

interface AppStateValue {
  status: Status;
  data: AppData;
  /** The user's local date. Updates at midnight and when the app returns to the foreground. */
  today: ISODate;
  isOnboarded: boolean;
  retryLoad(): void;
  dispatch(mutation: Mutation): Promise<DispatchResult>;
  resetAll(): Promise<void>;
}

const AppStateContext = createContext<AppStateValue | null>(null);

const msUntilMidnight = () => {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
  return next.getTime() - now.getTime();
};

export function AppStateProvider({ children, repository: injected }: { children: ReactNode; repository?: AppRepository }) {
  const repository = useRef(injected ?? createLocalRepository()).current;
  const [status, setStatus] = useState<Status>('loading');
  const [data, setData] = useState<AppData>(emptyAppData);
  const dataRef = useRef(data);
  const [today, setToday] = useState(getToday);
  const todayRef = useRef(today);

  const fetchData = useCallback(
    () =>
      repository
        .load()
        .then((loaded) => {
          dataRef.current = loaded;
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

  // Keep "today" correct across midnight, time-zone changes and returning from the background.
  useEffect(() => {
    const refresh = () => {
      todayRef.current = getToday();
      setToday(todayRef.current);
    };
    let timer = setTimeout(function tick() {
      refresh();
      timer = setTimeout(tick, msUntilMidnight());
    }, msUntilMidnight());
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, []);

  const dispatch = useCallback(
    async (mutation: Mutation): Promise<DispatchResult> => {
      const prev = dataRef.current;
      let next: AppData;
      try {
        next = applyMutation(prev, mutation, todayRef.current);
      } catch (e) {
        if (e instanceof MutationRejected) return { ok: false, reason: e.reason };
        throw e;
      }
      const earned = next.profile ? newlyEarned(next, todayRef.current, new Date().toISOString()) : [];
      if (earned.length) next = { ...next, achievements: [...next.achievements, ...earned] };
      dataRef.current = next;
      setData(next);
      try {
        await repository.commit(mutation, prev, next);
        return { ok: true, earned };
      } catch {
        return { ok: false, reason: 'save' };
      }
    },
    [repository],
  );

  const value = useMemo<AppStateValue>(
    () => ({
      status,
      data,
      today,
      isOnboarded: !!data.profile,
      retryLoad,
      dispatch,
      resetAll: async () => {
        await repository.reset();
        dataRef.current = emptyAppData();
        setData(dataRef.current);
      },
    }),
    [status, data, today, retryLoad, dispatch, repository],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used inside <AppStateProvider>');
  return ctx;
}
