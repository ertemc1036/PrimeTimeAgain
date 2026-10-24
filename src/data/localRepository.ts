import AsyncStorage from '@react-native-async-storage/async-storage';

import { emptyAppData, type AppData } from '@/domain/types';

import type { AppRepository } from './repository';

const STORAGE_KEY = 'pta.data.v2';
const LEGACY_KEYS = ['pta.data.v1'];

/**
 * On-device storage (AsyncStorage) for non-sensitive app data. Progress photos are files in the
 * app's private documents folder; only their local paths are stored here.
 * Writes are serialised so rapid taps can't interleave and lose updates.
 */
export function createLocalRepository(): AppRepository {
  let queue: Promise<void> = Promise.resolve();

  return {
    async load() {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) return migrate(JSON.parse(raw));
      // The v1 wellness prototype used a different model; prototype data is not carried over.
      await AsyncStorage.multiRemove(LEGACY_KEYS);
      return emptyAppData();
    },
    commit(_mutation, next) {
      const run = queue.then(() => AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)));
      queue = run.catch(() => undefined);
      return run;
    },
    async reset() {
      await queue;
      await AsyncStorage.multiRemove([STORAGE_KEY, ...LEGACY_KEYS]);
    },
  };
}

/** Fill in fields added after the data was saved. Unknown or corrupt data falls back to a clean state. */
export function migrate(value: unknown): AppData {
  const base = emptyAppData();
  if (!value || typeof value !== 'object' || (value as AppData).version !== 2) return base;
  const data = value as AppData;
  return { ...base, ...data, preferences: { ...base.preferences, ...data.preferences } };
}
