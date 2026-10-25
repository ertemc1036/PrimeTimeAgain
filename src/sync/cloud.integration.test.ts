/**
 * End-to-end sync test: the app's real SyncEngine + Edge Function transport + supabase-js against a
 * running backend (Supabase Auth, the sync function, Postgres with RLS).
 * Runs only when M30_CLOUD_URL and M30_CLOUD_ANON_KEY are set (see supabase/tests/README.md).
 * @jest-environment node
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { applyMutation, type Mutation } from '@/domain/mutations';
import { emptyAppData, type AppData, type Profile } from '@/domain/types';

import { SyncEngine } from './engine';
import { memorySyncStore } from './store';
import { functionTransport } from './supabaseTransport';

// jest-expo swaps the global fetch for Expo's native fetch stub; use a real HTTP client here.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const realFetch = require('node-fetch') as typeof fetch;
const URL = process.env.M30_CLOUD_URL;
const KEY = process.env.M30_CLOUD_ANON_KEY;
const maybe = URL && KEY ? describe : describe.skip;
const TODAY = '2026-10-26';
const run = Math.random().toString(36).slice(2, 8);

const profile: Profile = {
  name: 'Cloud', adultConfirmed: true, units: 'metric', goals: ['habits'], activityPrefs: ['gym'],
  food: { preferred: [], restrictions: [], allergies: [], dislikes: [] }, planningTime: '20:30',
  createdAt: '2026-10-20T08:00:00.000Z', onboardingCompletedAt: '2026-10-20T08:00:00.000Z',
};

async function phone(email: string, mode: 'signUp' | 'signIn', url = URL!) {
  const client: SupabaseClient = createClient(url, KEY!, { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: realFetch } });
  const auth = mode === 'signUp' ? await client.auth.signUp({ email, password: 'Str0ng-passw0rd' }) : await client.auth.signInWithPassword({ email, password: 'Str0ng-passw0rd' });
  if (auth.error || !auth.data.session) throw new Error(`auth failed: ${auth.error?.message}`);
  const p = {
    client,
    userId: auth.data.session.user.id,
    data: emptyAppData() as AppData,
    engine: null as unknown as SyncEngine,
    apply(m: Mutation) {
      const prev = p.data;
      p.data = applyMutation(prev, m, TODAY);
      p.engine.record(prev, p.data);
    },
  };
  p.engine = new SyncEngine({ store: memorySyncStore(), getData: () => p.data, applyRemote: async (n) => void (p.data = n), setTimer: () => 0, clearTimer: () => undefined });
  await p.engine.init();
  return p;
}
const transportOf = (c: SupabaseClient) => functionTransport(async () => c);
const workout = (id: string) => ({ id, date: TODAY, type: 'gym' as const, startTime: '07:30', durationMin: 40, description: 'Strength', entryMethod: 'manual' as const, createdAt: 'x', updatedAt: 'x' });

maybe('cloud sync against a real backend', () => {
  jest.setTimeout(60_000);
  const email = `cloud-${run}@minus30.test`;

  it('migrates local data into a new account and restores it on a second device', async () => {
    const a = await phone(email, 'signUp');
    // Used locally before creating the account.
    a.apply({ type: 'completeOnboarding', profile, journey: { programEnabled: true, startDate: TODAY, maintenance: false }, notifications: a.data.notifications });
    a.apply({ type: 'upsertFood', log: { id: 'meal1', date: TODAY, consumedAt: 'x', time: '08:00', mealType: 'breakfast', title: 'Oats', items: [], entryMethod: 'manual', createdAt: 'x', updatedAt: 'x' } });
    a.apply({ type: 'finishFoodLog', date: TODAY, at: 'x' });
    a.apply({ type: 'upsertActivity', log: workout('w-a') });
    await a.engine.connect(a.userId, transportOf(a.client), 'merge');
    expect(a.engine.snapshot()).toMatchObject({ status: 'idle', pending: 0, failed: 0 });

    // "Reinstall" / new phone: sign in and download.
    const b = await phone(email, 'signIn');
    await b.engine.connect(b.userId, transportOf(b.client), 'replace');
    expect(b.data.profile?.name).toBe('Cloud');
    expect(b.data.foodLogs.map((f) => f.title)).toEqual(['Oats']);
    expect(b.data.foodCompletions[TODAY]).toBeTruthy();
    expect(b.data.activityLogs.map((w) => w.id)).toEqual(['w-a']);
    expect(b.data.journey.programEnabled).toBe(true);

    // A third phone logs the same workout while offline, before it has ever downloaded anything:
    // the server recognises the duplicate and every phone keeps a single entry.
    const c = await phone(email, 'signIn');
    const offlineClient = createClient('http://127.0.0.1:9', KEY!, { auth: { persistSession: false }, global: { fetch: realFetch } });
    await c.engine.connect(c.userId, transportOf(offlineClient), 'replace');
    c.apply({ type: 'upsertActivity', log: workout('w-c') });
    await c.engine.connect(c.userId, transportOf(c.client), 'continue');
    expect(c.data.activityLogs.map((w) => w.id)).toEqual(['w-a']);

    // Offline edits on phone B reach phone A once B is back online.
    const offline = createClient('http://127.0.0.1:9', KEY!, { auth: { persistSession: false }, global: { fetch: realFetch } });
    await b.engine.connect(b.userId, transportOf(offline), 'continue');
    b.apply({ type: 'saveRestDay', date: '2026-10-25', at: 'x' });
    await b.engine.syncNow();
    expect(b.engine.snapshot().status).toBe('offline');
    expect(b.engine.snapshot().pending).toBe(1);
    await b.engine.connect(b.userId, transportOf(b.client), 'continue');
    expect(b.engine.snapshot().pending).toBe(0);
    await a.engine.syncNow();
    expect(a.data.recoveryLogs['2026-10-25']).toBeTruthy();
  });

  it('keeps other accounts completely separate', async () => {
    const c = await phone(`other-${run}@minus30.test`, 'signUp');
    await c.engine.connect(c.userId, transportOf(c.client), 'replace');
    expect(c.data.profile).toBeNull();
    expect(c.data.foodLogs).toHaveLength(0);
    expect(c.data.activityLogs).toHaveLength(0);
  });
});
