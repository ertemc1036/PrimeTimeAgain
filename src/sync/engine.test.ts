import { applyMutation, type Mutation } from '@/domain/mutations';
import { emptyAppData, type AppData, type Profile } from '@/domain/types';

import { SyncEngine, SyncHttpError, type SyncTransport } from './engine';
import { keyOf, type Change, type ChangeResult, type RemoteRecord, type SyncRequest, type SyncResponse } from './protocol';
import { memorySyncStore } from './store';

/** In-memory server with the same rules as supabase/functions/sync (LWW, tombstones, duplicate workouts). */
class FakeServer {
  private users = new Map<string, Map<string, RemoteRecord & { version: string }>>();
  private seq = 0;
  pageSize = 1000;
  calls = 0;
  transport(userId: string, net: { online: boolean; failNext?: number }): SyncTransport {
    return {
      sync: async (req) => {
        this.calls++;
        if (!net.online) throw new TypeError('Network request failed');
        if (net.failNext) {
          net.failNext--;
          throw new SyncHttpError(500);
        }
        return this.handle(userId, JSON.parse(JSON.stringify(req)));
      },
    };
  }
  rows(userId: string) {
    return [...(this.users.get(userId)?.values() ?? [])];
  }
  private handle(userId: string, req: SyncRequest): SyncResponse {
    const db = this.users.get(userId) ?? new Map();
    this.users.set(userId, db);
    const results: ChangeResult[] = [];
    const winners: RemoteRecord[] = [];
    const version = (c: Change) => (c.deleted ? '0deleted' : `1${JSON.stringify(c.data)}`);
    for (const c of req.changes) {
      const key = keyOf(c.collection, c.id);
      if (c.collection === 'activity' && !c.deleted && ((c.data?.durationMin as number) ?? 0) < 1) {
        results.push({ collection: c.collection, id: c.id, status: 'invalid', reason: 'activity' });
        continue;
      }
      if (c.collection === 'activity' && !c.deleted) {
        const d = c.data!;
        const dup = [...db.values()].find((r) => r.collection === 'activity' && !r.deleted && r.id !== c.id && ['type', 'date', 'startTime', 'durationMin'].every((k) => r.data?.[k] === d[k]));
        if (dup) {
          results.push({ collection: c.collection, id: c.id, status: 'duplicate', existingId: dup.id });
          winners.push(dup);
          continue;
        }
      }
      const cur = db.get(key);
      const v = version(c);
      if (!cur || c.updatedAt > cur.updatedAt || (c.updatedAt === cur.updatedAt && v > cur.version)) {
        db.set(key, { ...c, data: c.deleted ? null : c.data, seq: ++this.seq, version: v });
        results.push({ collection: c.collection, id: c.id, status: 'applied' });
      } else {
        results.push({ collection: c.collection, id: c.id, status: 'stale' });
        winners.push(cur);
      }
    }
    const newer = [...db.values()].filter((r) => r.seq > req.cursor).sort((a, b) => a.seq - b.seq);
    const page = newer.slice(0, this.pageSize);
    return { results, winners, records: page, cursor: page.length ? page[page.length - 1].seq : req.cursor, more: newer.length > this.pageSize, entitlement: { tier: 'free', status: 'none', expiresAt: null, productId: null } };
  }
}

const TODAY = '2026-10-26';
const profile: Profile = {
  name: 'Sam', adultConfirmed: true, units: 'metric', goals: ['habits'], activityPrefs: ['gym'],
  food: { preferred: [], restrictions: [], allergies: [], dislikes: [] }, planningTime: '20:30',
  createdAt: '2026-10-20T08:00:00.000Z', onboardingCompletedAt: '2026-10-20T08:00:00.000Z',
};

/** One simulated phone: local data + engine + network switch. */
function device(server: FakeServer, opts: { store?: ReturnType<typeof memorySyncStore>; clock?: { t: number } } = {}) {
  const clock = opts.clock ?? { t: Date.parse('2026-10-26T10:00:00Z') };
  const store = opts.store ?? memorySyncStore();
  const net = { online: true } as { online: boolean; failNext?: number };
  const d = {
    data: emptyAppData() as AppData,
    clock,
    net,
    store,
    engine: null as unknown as SyncEngine,
    timers: [] as (() => void)[],
    apply(m: Mutation) {
      const prev = d.data;
      d.data = applyMutation(prev, m, TODAY);
      d.engine.record(prev, d.data);
    },
  };
  d.engine = new SyncEngine({
    store,
    getData: () => d.data,
    applyRemote: async (next) => {
      d.data = next;
    },
    now: () => clock.t,
    setTimer: (fn) => d.timers.push(fn),
    clearTimer: () => undefined,
  });
  return d;
}
const gym = (id: string, extra: object = {}) => ({ id, date: TODAY, type: 'gym' as const, startTime: '18:00', durationMin: 45, description: 'Upper body', entryMethod: 'manual' as const, createdAt: 'x', updatedAt: 'x', ...extra });
const food = (id: string, title: string) => ({ id, date: TODAY, consumedAt: 'x', time: '12:00', mealType: 'lunch' as const, title, items: [], entryMethod: 'manual' as const, createdAt: 'x', updatedAt: 'x' });

describe('sync engine', () => {
  it('keeps changes made offline and uploads them when the connection returns', async () => {
    const server = new FakeServer();
    const a = device(server);
    await a.engine.init();
    a.net.online = false;
    await a.engine.connect('u1', server.transport('u1', a.net), 'replace');
    expect(a.engine.snapshot().status).toBe('offline');
    a.apply({ type: 'completeOnboarding', profile, journey: { programEnabled: false, maintenance: false }, notifications: a.data.notifications });
    a.apply({ type: 'saveRestDay', date: TODAY, at: 'x' });
    expect(a.engine.snapshot().pending).toBeGreaterThanOrEqual(2);
    expect(a.timers.length).toBeGreaterThan(0); // retry scheduled
    a.net.online = true;
    await a.engine.syncNow();
    expect(a.engine.snapshot()).toMatchObject({ status: 'idle', pending: 0 });
    expect(server.rows('u1').some((r) => r.collection === 'rest' && r.id === TODAY)).toBe(true);
  });

  it('survives an app restart with unsent changes', async () => {
    const server = new FakeServer();
    const store = memorySyncStore();
    const a = device(server, { store });
    await a.engine.init();
    await a.engine.connect('u1', server.transport('u1', a.net), 'replace');
    a.net.online = false;
    a.apply({ type: 'upsertFood', log: food('f1', 'Salad') });
    await new Promise((r) => setTimeout(r, 0));
    // "Restart": a new engine reads the persisted outbox.
    const b = device(server, { store });
    b.data = a.data;
    await b.engine.init();
    expect(b.engine.snapshot().pending).toBe(1);
    await b.engine.connect('u1', server.transport('u1', b.net), 'continue');
    expect(server.rows('u1').find((r) => r.id === 'f1')?.data?.title).toBe('Salad');
  });

  it('two devices converge; the later edit wins on both', async () => {
    const server = new FakeServer();
    const clock = { t: Date.parse('2026-10-26T10:00:00Z') };
    const a = device(server, { clock });
    const b = device(server, { clock });
    await a.engine.init();
    await b.engine.init();
    await a.engine.connect('u1', server.transport('u1', a.net), 'replace');
    a.apply({ type: 'upsertFood', log: food('f1', 'Salad') });
    await a.engine.syncNow();
    await b.engine.connect('u1', server.transport('u1', b.net), 'replace');
    expect(b.data.foodLogs.map((f) => f.title)).toEqual(['Salad']);

    b.net.online = false;
    b.apply({ type: 'upsertFood', log: food('f1', 'Salad (B)') });
    clock.t += 60_000;
    a.apply({ type: 'upsertFood', log: food('f1', 'Salad (A, later)') });
    await a.engine.syncNow();
    b.net.online = true;
    await b.engine.syncNow();
    await a.engine.syncNow();
    expect(a.data.foodLogs[0].title).toBe('Salad (A, later)');
    expect(b.data.foodLogs[0].title).toBe('Salad (A, later)');
  });

  it('does not lose an edit made while a sync is in flight', async () => {
    const server = new FakeServer();
    const a = device(server);
    await a.engine.init();
    await a.engine.connect('u1', server.transport('u1', a.net), 'replace');
    a.apply({ type: 'upsertFood', log: food('f1', 'v1') });
    const inFlight = a.engine.syncNow();
    a.clock.t += 1000;
    a.apply({ type: 'upsertFood', log: food('f1', 'v2') });
    await inFlight;
    await a.engine.syncNow();
    expect(server.rows('u1').find((r) => r.id === 'f1')?.data?.title).toBe('v2');
    expect(a.data.foodLogs[0].title).toBe('v2');
    expect(a.engine.snapshot().pending).toBe(0);
  });

  it('never keeps the same workout twice across devices', async () => {
    const server = new FakeServer();
    const a = device(server);
    const b = device(server);
    await a.engine.init();
    await b.engine.init();
    await a.engine.connect('u1', server.transport('u1', a.net), 'replace');
    await b.engine.connect('u1', server.transport('u1', b.net), 'replace');
    a.apply({ type: 'upsertActivity', log: gym('wa') });
    b.apply({ type: 'upsertActivity', log: gym('wb') });
    await a.engine.syncNow();
    await b.engine.syncNow();
    await a.engine.syncNow();
    expect(a.data.activityLogs.map((x) => x.id)).toEqual(['wa']);
    expect(b.data.activityLogs.map((x) => x.id)).toEqual(['wa']);
    expect(server.rows('u1').filter((r) => r.collection === 'activity')).toHaveLength(1);
  });

  it('keeps records the server refuses and lets the user retry or discard them', async () => {
    const server = new FakeServer();
    const a = device(server);
    await a.engine.init();
    await a.engine.connect('u1', server.transport('u1', a.net), 'replace');
    const prev = a.data;
    a.data = { ...a.data, activityLogs: [gym('bad', { durationMin: 0 })] };
    a.engine.record(prev, a.data);
    await a.engine.syncNow();
    expect(a.engine.snapshot()).toMatchObject({ pending: 0, failed: 1 });
    expect(a.data.activityLogs).toHaveLength(1); // still on the device
    await a.engine.resolveFailed('discard');
    expect(a.engine.snapshot().failed).toBe(0);
  });

  it('deletes propagate as tombstones', async () => {
    const server = new FakeServer();
    const a = device(server);
    const b = device(server);
    await a.engine.init();
    await b.engine.init();
    await a.engine.connect('u1', server.transport('u1', a.net), 'replace');
    a.apply({ type: 'upsertFood', log: food('f1', 'Salad') });
    await a.engine.syncNow();
    await b.engine.connect('u1', server.transport('u1', b.net), 'replace');
    expect(b.data.foodLogs).toHaveLength(1);
    a.clock.t += 1000;
    a.apply({ type: 'deleteFood', id: 'f1' });
    await a.engine.syncNow();
    await b.engine.syncNow();
    expect(b.data.foodLogs).toHaveLength(0);
  });

  it('merge uploads existing local data; replace downloads the account instead', async () => {
    const server = new FakeServer();
    const a = device(server);
    await a.engine.init();
    a.apply({ type: 'completeOnboarding', profile, journey: { programEnabled: false, maintenance: false }, notifications: a.data.notifications });
    a.apply({ type: 'upsertFood', log: food('local', 'Before account') });
    expect(a.engine.snapshot().pending).toBe(0); // nothing queued without an account
    await a.engine.connect('u1', server.transport('u1', a.net), 'merge');
    expect(server.rows('u1').some((r) => r.id === 'local')).toBe(true);
    expect(server.rows('u1').some((r) => r.collection === 'profile')).toBe(true);

    const fresh = device(server);
    await fresh.engine.init();
    fresh.data = { ...fresh.data, foodLogs: [food('stray', 'Other data')] };
    await fresh.engine.connect('u1', server.transport('u1', fresh.net), 'replace');
    expect(server.rows('u1').some((r) => r.id === 'stray')).toBe(false);
    expect(fresh.data.profile?.name).toBe('Sam');
  });

  it('keeps accounts apart when switching users on one device', async () => {
    const server = new FakeServer();
    const a = device(server);
    await a.engine.init();
    await a.engine.connect('alice', server.transport('alice', a.net), 'replace');
    a.apply({ type: 'upsertFood', log: food('fa', 'Alice meal') });
    await a.engine.syncNow();
    expect(await a.engine.disconnect()).toBe(0);
    a.data = emptyAppData(); // sign-out clears the device
    await a.engine.connect('bob', server.transport('bob', a.net), 'replace');
    a.apply({ type: 'upsertFood', log: food('fb', 'Bob meal') });
    await a.engine.syncNow();
    expect(a.data.foodLogs.map((f) => f.id)).toEqual(['fb']);
    expect(server.rows('bob').map((r) => r.id)).not.toContain('fa');
    expect(server.rows('alice').map((r) => r.id)).not.toContain('fb');
  });

  it('pages through large downloads and reports unsynced changes on sign-out', async () => {
    const server = new FakeServer();
    server.pageSize = 3;
    const a = device(server);
    await a.engine.init();
    await a.engine.connect('u1', server.transport('u1', a.net), 'replace');
    for (let i = 0; i < 8; i++) a.apply({ type: 'upsertFood', log: food(`f${i}`, `Meal ${i}`) });
    await a.engine.syncNow();
    const b = device(server);
    await b.engine.init();
    await b.engine.connect('u1', server.transport('u1', b.net), 'replace');
    expect(b.data.foodLogs).toHaveLength(8);
    b.net.online = false;
    b.apply({ type: 'deleteFood', id: 'f0' });
    await b.engine.syncNow();
    expect(await b.engine.disconnect()).toBe(1);
  });

  it('backs off after server errors and recovers', async () => {
    const server = new FakeServer();
    const a = device(server);
    await a.engine.init();
    a.net.failNext = 2;
    await a.engine.connect('u1', server.transport('u1', a.net), 'replace');
    expect(a.engine.snapshot().status).toBe('error');
    await a.engine.syncNow();
    expect(a.engine.snapshot().status).toBe('error');
    await a.engine.syncNow();
    expect(a.engine.snapshot().status).toBe('idle');
  });
});
