import AsyncStorage from '@react-native-async-storage/async-storage';

import { emptySyncState, type SyncState, type SyncStore } from './engine';

const KEY = 'm30.v1.sync';

/** Sync bookkeeping (owner account, cursor, outbox) persisted next to the app data. */
export const asyncStorageSyncStore = (): SyncStore => ({
  async load() {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      return raw ? { ...emptySyncState(), ...(JSON.parse(raw) as Partial<SyncState>) } : emptySyncState();
    } catch {
      return emptySyncState();
    }
  },
  async save(state) {
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
  },
});

export const memorySyncStore = (initial?: SyncState): SyncStore & { value: SyncState } => {
  const s = { value: initial ?? emptySyncState() };
  return {
    get value() {
      return s.value;
    },
    async load() {
      return JSON.parse(JSON.stringify(s.value));
    },
    async save(state) {
      s.value = JSON.parse(JSON.stringify(state));
    },
  };
};
