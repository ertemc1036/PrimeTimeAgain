import AsyncStorage from '@react-native-async-storage/async-storage';

import { emptyAppData } from '@/domain/types';

import { createLocalRepository } from './localRepository';

// eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factories must use require
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

describe('local repository', () => {
  beforeEach(() => AsyncStorage.clear());

  it('persists changes across a "restart" and only writes changed collections', async () => {
    const repo = createLocalRepository();
    const prev = emptyAppData();
    const next = { ...prev, recoveryLogs: { '2026-10-25': { date: '2026-10-25', createdAt: 'x' } } };
    const spy = jest.spyOn(AsyncStorage, 'multiSet');
    await repo.commit({ type: 'saveRestDay', date: '2026-10-25', at: 'x' }, prev, next);
    expect(spy.mock.calls[0][0].map(([k]) => k)).toEqual(['m30.v1.recoveryLogs']);
    const reloaded = await createLocalRepository().load();
    expect(reloaded.recoveryLogs['2026-10-25']).toBeDefined();
    expect(reloaded.foodLogs).toEqual([]);
  });

  it('survives a corrupt value and resets cleanly', async () => {
    await AsyncStorage.setItem('m30.v1.foodLogs', '{bad json');
    const repo = createLocalRepository();
    expect((await repo.load()).foodLogs).toEqual([]);
    await repo.reset();
    expect(await AsyncStorage.getAllKeys()).toEqual([]);
  });
});
