import AsyncStorage from '@react-native-async-storage/async-storage';

import { emptyAppData, type AppData } from '@/domain/types';

import type { AppRepository } from './repository';

const PREFIX = 'm30.v1.';
const KEYS = Object.keys(emptyAppData()).filter((k) => k !== 'version') as (keyof Omit<AppData, 'version'>)[];

/**
 * Local-first storage: each collection (food logs, activities, plans …) has its own key, and only
 * collections that changed are written. Writes are serialised so rapid taps can't lose updates.
 */
export function createLocalRepository(): AppRepository {
  let queue: Promise<void> = Promise.resolve();

  return {
    async load() {
      const pairs = await AsyncStorage.multiGet(KEYS.map((k) => PREFIX + k));
      const base = emptyAppData();
      const data: AppData = { ...base };
      for (const [key, raw] of pairs) {
        if (!raw) continue;
        const k = key.slice(PREFIX.length) as keyof Omit<AppData, 'version'>;
        try {
          (data as unknown as Record<string, unknown>)[k] = JSON.parse(raw);
        } catch {
          // Corrupt value: keep the default for this collection rather than failing the whole app.
        }
      }
      return migrate(data);
    },
    commit(_mutation, prev, next) {
      const changed = KEYS.filter((k) => prev[k] !== next[k]);
      const run = queue.then(() =>
        changed.length ? AsyncStorage.multiSet(changed.map((k) => [PREFIX + k, JSON.stringify(next[k])])) : undefined,
      );
      queue = run.catch(() => undefined);
      return run;
    },
    async reset() {
      await queue;
      await AsyncStorage.multiRemove(KEYS.map((k) => PREFIX + k));
    },
  };
}

/** Fill in fields added after data was saved. */
export function migrate(data: AppData): AppData {
  const base = emptyAppData();
  return {
    ...data,
    notifications: { ...base.notifications, ...data.notifications },
    eatingWindow: { ...base.eatingWindow, ...data.eatingWindow },
    journey: { ...base.journey, ...data.journey },
    coach: { ...base.coach, ...data.coach },
  };
}
