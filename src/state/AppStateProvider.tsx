import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { createLocalRepository } from '@/data/localRepository';
import type { AppRepository } from '@/data/repository';
import { today as getToday } from '@/domain/dates';
import { generateMissions } from '@/domain/missions';
import { applyMutation, type Mutation } from '@/domain/mutations';
import { isInProgram } from '@/domain/program';
import { emptyAppData, type AppData, type ISODate } from '@/domain/types';

type Status = 'loading' | 'ready' | 'error';

interface AppStateValue {
  status: Status;
  data: AppData;
  /** The user's local date; refreshes when the app returns to the foreground. */
  today: ISODate;
  isOnboarded: boolean;
  /** Set when the last write failed, so screens can show a gentle error. */
  saveError: boolean;
  dismissSaveError(): void;
  retryLoad(): void;
  /** Apply a change: UI updates immediately, storage is written in the background. */
  dispatch(mutation: Mutation): Promise<void>;
  resetAll(): Promise<void>;
}

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children, repository: injected }: { children: ReactNode; repository?: AppRepository }) {
  const repository = useRef(injected ?? createLocalRepository()).current;
  const [status, setStatus] = useState<Status>('loading');
  const [data, setData] = useState<AppData>(emptyAppData);
  const dataRef = useRef(data);
  const [today, setToday] = useState(getToday);
  const todayRef = useRef(today);
  const [saveError, setSaveError] = useState(false);

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

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') return;
      todayRef.current = getToday();
      setToday(todayRef.current);
    });
    return () => sub.remove();
  }, []);

  const dispatch = useCallback(
    (mutation: Mutation) => {
      const next = applyMutation(dataRef.current, mutation, todayRef.current);
      if (next === dataRef.current) return Promise.resolve();
      dataRef.current = next;
      setData(next);
      return repository.commit(mutation, next).catch((e: unknown) => {
        setSaveError(true);
        throw e;
      });
    },
    [repository],
  );

  // Plan today's missions the first time the app is opened on a program day.
  useEffect(() => {
    const { program, profile, goals, days } = data;
    if (status !== 'ready' || !program || !profile || !isInProgram(program, today)) return;
    const day = days[today];
    if (day?.generated || day?.recovery) return;
    const missions = generateMissions(goals, program, today, profile.startingPoint, day?.missions ?? []);
    dispatch({ type: 'ensureDay', date: today, missions }).catch(() => undefined);
  }, [status, data, today, dispatch]);

  const value = useMemo<AppStateValue>(
    () => ({
      status,
      data,
      today,
      isOnboarded: !!data.profile && !!data.program,
      saveError,
      dismissSaveError: () => setSaveError(false),
      retryLoad,
      dispatch,
      resetAll: async () => {
        await repository.reset();
        dataRef.current = emptyAppData();
        setData(dataRef.current);
      },
    }),
    [status, data, today, saveError, retryLoad, dispatch, repository],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used inside <AppStateProvider>');
  return ctx;
}
