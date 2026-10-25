import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { deleteAccount as deleteAccountRemote, signOut as signOutRemote } from '@/services/auth';
import { getSupabase } from '@/services/supabase/client';
import { SyncEngine, type SyncSnapshot } from '@/sync/engine';
import { uploadPendingPhotos } from '@/sync/photos';
import { hasUserData } from '@/sync/records';
import { asyncStorageSyncStore } from '@/sync/store';
import { functionTransport } from '@/sync/supabaseTransport';

import { useAppState } from './AppStateProvider';
import { useAuth } from './AuthProvider';

interface SyncValue extends SyncSnapshot {
  /** Set when a signed-in account meets data that already exists on this device. */
  decision: null | { userId: string };
  decide(mode: 'merge' | 'replace'): Promise<void>;
  syncNow(): Promise<void>;
  resolveFailed(action: 'retry' | 'discard'): Promise<void>;
  /** Upload what's possible, then sign out and remove this account's data from the device. */
  signOut(opts?: { force?: boolean }): Promise<{ ok: true } | { ok: false; unsynced: number }>;
  deleteAccount(): Promise<boolean>;
}

const SyncContext = createContext<SyncValue | null>(null);

/** One engine per app process; the provider binds it to the current app state. */
type AppApi = ReturnType<typeof useAppState>;
const binding: { app: AppApi | null } = { app: null };
let engineSingleton: SyncEngine | null = null;
const getEngine = () =>
  (engineSingleton ??= new SyncEngine({
    store: asyncStorageSyncStore(),
    getData: () => binding.app!.getData(),
    applyRemote: (next) => binding.app!.applyRemote(next),
  }));
const PERIODIC_MS = 5 * 60 * 1000;

export function SyncProvider({ children }: { children: ReactNode }) {
  const app = useAppState();
  const auth = useAuth();
  const appRef = useRef(app);
  useEffect(() => {
    appRef.current = app;
    binding.app = app;
  }, [app]);
  const engine = getEngine();
  const [snap, setSnap] = useState<SyncSnapshot>(engine.snapshot());
  const [ready, setReady] = useState(false);
  const [decision, setDecision] = useState<SyncValue['decision']>(null);
  const transport = useMemo(() => functionTransport(getSupabase), []);

  useEffect(() => {
    const unsub = engine.subscribe(setSnap);
    void engine.init().then(() => setReady(true));
    return unsub;
  }, [engine]);

  // Local changes → outbox.
  useEffect(() => app.onLocalChange((prev, next) => engine.record(prev, next)), [app, engine]);

  // Connect when signed in.
  const userId = auth.status === 'signedIn' ? auth.user?.id : null;
  useEffect(() => {
    if (!ready || app.status !== 'ready' || !userId) return;
    if (engine.owner === userId) {
      void engine.connect(userId, transport, 'continue');
    } else if (engine.owner && engine.owner !== userId) {
      // Data of a different account is on the device (e.g. a session ended elsewhere): never mix it.
      void appRef.current.resetAll().then(() => engine.connect(userId, transport, 'replace'));
    } else if (hasUserData(appRef.current.getData())) {
      setDecision({ userId });
    } else {
      void engine.connect(userId, transport, 'replace');
    }
  }, [ready, app.status, userId, engine, transport]);

  // Foreground + periodic sync, then upload photos that only exist on this device.
  useEffect(() => {
    if (!userId) return;
    const sync = () => void engine.syncNow().then(() => uploadPendingPhotos(userId, appRef.current));
    const sub = AppState.addEventListener('change', (s) => s === 'active' && sync());
    const id = setInterval(() => AppState.currentState === 'active' && sync(), PERIODIC_MS);
    return () => {
      sub.remove();
      clearInterval(id);
    };
  }, [userId, engine]);
  useEffect(() => {
    if (userId && snap.status === 'idle' && snap.owner === userId) void uploadPendingPhotos(userId, appRef.current);
  }, [userId, snap.status, snap.owner, snap.lastSyncAt]);

  const decide = useCallback(
    async (mode: 'merge' | 'replace') => {
      const d = decision;
      if (!d) return;
      setDecision(null);
      if (mode === 'replace') await appRef.current.resetAll();
      await engine.connect(d.userId, transport, mode);
    },
    [decision, engine, transport],
  );

  const signOut = useCallback<SyncValue['signOut']>(
    async (opts) => {
      await engine.syncNow();
      const unsynced = engine.snapshot().pending + engine.snapshot().failed;
      if (unsynced && !opts?.force) return { ok: false, unsynced };
      await engine.disconnect();
      await signOutRemote();
      await appRef.current.resetAll();
      return { ok: true };
    },
    [engine],
  );

  const deleteAccount = useCallback(async () => {
    const r = await deleteAccountRemote();
    if (!r.ok) return false;
    await engine.disconnect();
    await appRef.current.resetAll();
    return true;
  }, [engine]);

  const value = useMemo<SyncValue>(
    () => ({
      ...snap,
      decision,
      decide,
      syncNow: () => engine.syncNow(),
      resolveFailed: (a) => engine.resolveFailed(a),
      signOut,
      deleteAccount,
    }),
    [snap, decision, decide, engine, signOut, deleteAccount],
  );
  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncValue {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync must be used inside <SyncProvider>');
  return ctx;
}
