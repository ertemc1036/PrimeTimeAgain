import AsyncStorage from '@react-native-async-storage/async-storage';

import { emptyAppData, type AppData } from '@/domain/types';

import type { AppRepository } from './repository';

const STORAGE_KEY = 'pta.data.v1';

/**
 * Local, on-device implementation backed by AsyncStorage.
 * Holds non-sensitive app data only. Auth tokens will use expo-secure-store.
 * Writes are serialised so rapid taps can't interleave and lose updates.
 */
export function createLocalRepository(): AppRepository {
  let cache: AppData | null = null;
  let queue: Promise<void> = Promise.resolve();

  const read = async (): Promise<AppData> => {
    if (cache) return cache;
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    cache = raw ? migrate(JSON.parse(raw)) : emptyAppData();
    return cache;
  };

  const write = (update: (data: AppData) => AppData): Promise<void> => {
    const next = queue.then(async () => {
      const data = update(await read());
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      cache = data;
    });
    queue = next.catch(() => undefined);
    return next;
  };

  return {
    load: read,
    saveProfile: (profile) => write((d) => ({ ...d, profile })),
    saveGoals: (goalIds) => write((d) => ({ ...d, goalIds })),
    setCompletion: (date, goalId, done) =>
      write((d) => {
        const current = new Set(d.log[date] ?? []);
        if (done) current.add(goalId);
        else current.delete(goalId);
        return { ...d, log: { ...d.log, [date]: [...current] } };
      }),
    addReflection: (reflection) => write((d) => ({ ...d, reflections: [reflection, ...d.reflections] })),
    savePreferences: (preferences) => write((d) => ({ ...d, preferences })),
    replaceAll: (data) => write(() => data),
    reset: async () => {
      await queue;
      await AsyncStorage.removeItem(STORAGE_KEY);
      cache = emptyAppData();
    },
  };
}

/** Upgrade older stored shapes. Unknown or corrupt data falls back to a clean state. */
function migrate(value: unknown): AppData {
  const base = emptyAppData();
  if (!value || typeof value !== 'object' || (value as AppData).version !== 1) return base;
  return { ...base, ...(value as AppData) };
}
