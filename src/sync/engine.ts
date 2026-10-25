import type { AppData } from '@/domain/types';

import { keyOf, MAX_BATCH, type Change, type RemoteRecord, type ServerEntitlement, type SyncRequest, type SyncResponse } from './protocol';
import { allChanges, applyRecords, diffRecords } from './records';

/**
 * Local-first sync engine.
 * - Every local change is stamped and queued in a persistent outbox (survives restarts and offline use).
 * - A sync pushes up to MAX_BATCH changes and pulls everything newer than the cursor in one request.
 * - The server decides conflicts (last write wins, deterministic tie-break); its winners are applied.
 * - An outbox entry is removed only after the server accepted, rejected-as-stale or merged it.
 *   Records the server refuses as invalid move to `failed` (kept, shown to the user), never dropped.
 * - Local data belongs to one account (`owner`); data of another account is never mixed in.
 */
export interface SyncState {
  owner: string | null;
  cursor: number;
  pending: Record<string, Change>;
  failed: Record<string, { change: Change; reason: string }>;
  lastSyncAt: string | null;
  lastStamp: number;
  entitlement: ServerEntitlement | null;
}

export const emptySyncState = (): SyncState => ({ owner: null, cursor: 0, pending: {}, failed: {}, lastSyncAt: null, lastStamp: 0, entitlement: null });

export interface SyncStore {
  load(): Promise<SyncState>;
  save(state: SyncState): Promise<void>;
}

export class SyncHttpError extends Error {
  constructor(
    readonly status: number,
    readonly code?: string,
  ) {
    super(`sync http ${status}${code ? ` ${code}` : ''}`);
  }
}

export interface SyncTransport {
  sync(req: SyncRequest): Promise<SyncResponse>;
}

export type SyncStatus = 'off' | 'idle' | 'syncing' | 'offline' | 'error' | 'signedOut';

export interface SyncSnapshot {
  status: SyncStatus;
  owner: string | null;
  pending: number;
  failed: number;
  lastSyncAt: string | null;
  entitlement: ServerEntitlement | null;
}

export interface EngineDeps {
  store: SyncStore;
  getData(): AppData;
  /** Replace local data with a version that includes remote changes (must not re-enter `record`). */
  applyRemote(next: AppData): Promise<void>;
  now?: () => number;
  /** Delay before syncing after a local change. */
  debounceMs?: number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (t: unknown) => void;
}

export class SyncEngine {
  private state: SyncState = emptySyncState();
  private transport: SyncTransport | null = null;
  private running: Promise<void> | null = null;
  private again = false;
  private status: SyncStatus = 'off';
  private timer: unknown = null;
  private failures = 0;
  private listeners = new Set<(s: SyncSnapshot) => void>();
  private saveQueue: Promise<void> = Promise.resolve();
  private readonly now: () => number;
  private readonly setTimer: (fn: () => void, ms: number) => unknown;
  private readonly clearTimer: (t: unknown) => void;

  constructor(private readonly deps: EngineDeps) {
    this.now = deps.now ?? Date.now;
    this.setTimer = deps.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
    this.clearTimer = deps.clearTimer ?? ((t) => clearTimeout(t as ReturnType<typeof setTimeout>));
  }

  async init() {
    this.state = await this.deps.store.load();
    this.emit();
  }

  snapshot(): SyncSnapshot {
    return {
      status: this.status,
      owner: this.state.owner,
      pending: Object.keys(this.state.pending).length,
      failed: Object.keys(this.state.failed).length,
      lastSyncAt: this.state.lastSyncAt,
      entitlement: this.state.entitlement,
    };
  }
  get owner() {
    return this.state.owner;
  }
  get failedChanges() {
    return Object.values(this.state.failed);
  }

  subscribe(fn: (s: SyncSnapshot) => void) {
    this.listeners.add(fn);
    fn(this.snapshot());
    return () => void this.listeners.delete(fn);
  }
  private emit() {
    const s = this.snapshot();
    this.listeners.forEach((l) => l(s));
  }
  private setStatus(s: SyncStatus) {
    this.status = s;
    this.emit();
  }
  private persist() {
    const copy: SyncState = JSON.parse(JSON.stringify(this.state));
    this.saveQueue = this.saveQueue.then(() => this.deps.store.save(copy)).catch(() => undefined);
    return this.saveQueue;
  }

  /** Monotonic ISO timestamp: never goes backwards on this device, even if the clock does. */
  private stamp(): string {
    const t = Math.max(this.now(), this.state.lastStamp + 1);
    this.state.lastStamp = t;
    return new Date(t).toISOString();
  }

  /** Called after every local mutation. Queues changed records when an account is connected. */
  record(prev: AppData, next: AppData) {
    if (!this.state.owner || prev === next) return;
    const changes = diffRecords(prev, next, this.stamp());
    if (!changes.length) return;
    for (const c of changes) {
      const key = keyOf(c.collection, c.id);
      this.state.pending[key] = c;
      delete this.state.failed[key];
    }
    void this.persist();
    this.emit();
    this.schedule(this.deps.debounceMs ?? 1500);
  }

  /**
   * Connect local data to an account.
   * - 'continue': the device already belongs to this account.
   * - 'merge': upload everything on this device into the account (first sign-in with local data).
   * - 'replace': local data is discarded and the account's data is downloaded.
   */
  async connect(userId: string, transport: SyncTransport, mode: 'continue' | 'merge' | 'replace') {
    this.transport = transport;
    if (mode !== 'continue' || this.state.owner !== userId) {
      const fresh = emptySyncState();
      fresh.lastStamp = this.state.lastStamp;
      this.state = { ...fresh, owner: userId };
      if (mode === 'merge') {
        for (const c of allChanges(this.deps.getData(), this.stamp())) this.state.pending[keyOf(c.collection, c.id)] = c;
      }
      await this.persist();
    }
    this.setStatus('idle');
    await this.syncNow();
  }

  /** Detach (sign-out / account deletion). Returns how many local changes had not been uploaded. */
  async disconnect(): Promise<number> {
    const unsynced = Object.keys(this.state.pending).length + Object.keys(this.state.failed).length;
    if (this.timer) this.clearTimer(this.timer);
    this.timer = null;
    this.transport = null;
    const keepStamp = this.state.lastStamp;
    this.state = { ...emptySyncState(), lastStamp: keepStamp };
    await this.persist();
    this.setStatus('off');
    return unsynced;
  }

  /** Keep failed records out of the way: retry them as normal changes, or discard them. */
  async resolveFailed(action: 'retry' | 'discard') {
    if (action === 'retry') for (const [key, f] of Object.entries(this.state.failed)) this.state.pending[key] = { ...f.change, updatedAt: this.stamp() };
    this.state.failed = {};
    await this.persist();
    this.emit();
    if (action === 'retry') void this.syncNow();
  }

  schedule(ms: number) {
    if (!this.transport) return;
    if (this.timer) this.clearTimer(this.timer);
    this.timer = this.setTimer(() => {
      this.timer = null;
      void this.syncNow();
    }, ms);
  }

  /** Run a sync now (coalesces concurrent calls). Resolves when local and server agree or a retry is scheduled. */
  syncNow(): Promise<void> {
    if (!this.transport || !this.state.owner) return Promise.resolve();
    if (this.running) {
      this.again = true;
      return this.running;
    }
    this.running = this.run().finally(() => {
      this.running = null;
      if (this.again) {
        this.again = false;
        void this.syncNow();
      }
    });
    return this.running;
  }

  private async run() {
    const transport = this.transport!;
    const owner = this.state.owner;
    this.setStatus('syncing');
    try {
      for (let round = 0; round < 50; round++) {
        const sent = Object.values(this.state.pending).slice(0, MAX_BATCH);
        const res = await transport.sync({ cursor: this.state.cursor, changes: sent });
        if (this.state.owner !== owner) return; // account changed while the request was in flight
        this.applyResults(sent, res);
        const incoming = [...res.winners, ...res.records].filter((r) => !this.state.pending[keyOf(r.collection, r.id)]);
        const duplicates = res.results.flatMap((r) => (r.status === 'duplicate' ? [{ collection: r.collection, id: r.id, data: null, deleted: true, updatedAt: '', seq: 0 } as RemoteRecord] : []));
        if (incoming.length || duplicates.length) await this.deps.applyRemote(applyRecords(this.deps.getData(), [...duplicates, ...incoming]));
        this.state.cursor = Math.max(this.state.cursor, res.cursor);
        if (res.entitlement) this.state.entitlement = res.entitlement;
        this.state.lastSyncAt = new Date(this.now()).toISOString();
        await this.persist();
        if (!res.more && !Object.keys(this.state.pending).length) break;
      }
      this.failures = 0;
      this.setStatus('idle');
    } catch (e) {
      if (e instanceof SyncHttpError && e.status === 401) {
        this.setStatus('signedOut');
        return;
      }
      this.failures++;
      this.setStatus(e instanceof SyncHttpError ? 'error' : 'offline');
      // Exponential backoff: 5 s, 10 s, 20 s … up to 5 minutes. Nothing is dropped meanwhile.
      this.schedule(Math.min(5000 * 2 ** (this.failures - 1), 5 * 60 * 1000));
    }
  }

  private applyResults(sent: Change[], res: SyncResponse) {
    const sentByKey = new Map(sent.map((c) => [keyOf(c.collection, c.id), c]));
    for (const r of res.results) {
      const key = keyOf(r.collection, r.id);
      const c = sentByKey.get(key);
      // Only clear the entry if it wasn't edited again while the request was in flight.
      if (!c || this.state.pending[key] !== c) continue;
      delete this.state.pending[key];
      if (r.status === 'invalid') this.state.failed[key] = { change: c, reason: r.reason };
    }
  }
}
