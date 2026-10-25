import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { getSupabase } from '@/services/supabase/client';
import { FREE, isPro as isProEntitlement, type Entitlement } from '@/services/subscriptions/entitlements';
import { identify, onCustomerInfo } from '@/services/subscriptions/revenuecat';
import type { ServerEntitlement } from '@/sync/protocol';

import { useAuth } from './AuthProvider';
import { useSync } from './SyncProvider';

interface ProValue {
  /** Pro as far as this device can tell (server-verified entitlement or a fresh store purchase). */
  isPro: boolean;
  /** Status details for the account screen and paywall. */
  status: Entitlement['status'];
  expiresAt: string | null;
  /** Development builds only: open Pro screens without a subscription. Grants no AI access — the server decides. */
  devPreview: boolean;
  setDevPreview(v: boolean): void;
  canOpenPro: boolean;
  /** Ask the server to re-check the subscription with RevenueCat (after purchase/restore). */
  refresh(): Promise<void>;
  /** Apply the entitlement returned by a purchase or restore immediately. */
  setStoreEntitlement(e: Entitlement): void;
}

const ProContext = createContext<ProValue | null>(null);

const fromServer = (e: ServerEntitlement | null): Entitlement =>
  e ? { tier: e.tier, status: e.status, source: 'revenuecat', expiresAt: e.expiresAt ?? undefined, productId: e.productId ?? undefined } : FREE;

export function ProProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const sync = useSync();
  const userId = auth.status === 'signedIn' ? (auth.user?.id ?? null) : null;
  // Values are tagged with the account they belong to, so nothing carries over to another account.
  const [refreshed, setRefreshed] = useState<{ uid: string; e: ServerEntitlement } | null>(null);
  const [storeState, setStoreState] = useState<{ uid: string | null; e: Entitlement }>({ uid: null, e: FREE });
  const [devPreview, setDevPreviewState] = useState(false);
  // Latest server view: an explicit refresh, otherwise what the last sync delivered (works across devices).
  const server = userId ? (refreshed?.uid === userId ? refreshed.e : (sync.entitlement ?? null)) : null;
  const store = storeState.uid === userId ? storeState.e : FREE;
  const setStore = useCallback((e: Entitlement) => setStoreState({ uid: userId, e }), [userId]);

  // RevenueCat customer info (installed app only).
  useEffect(() => {
    let unsub: (() => void) | undefined;
    void identify(userId).then((e) => e && setStoreState({ uid: userId, e }));
    void onCustomerInfo((e) => setStoreState({ uid: userId, e })).then((u) => (unsub = u));
    return () => unsub?.();
  }, [userId]);

  const refresh = useCallback(async () => {
    const sb = await getSupabase();
    if (!sb || !userId) return;
    const { data } = await sb.functions.invoke<ServerEntitlement>('entitlement', { body: {} });
    if (data?.tier) setRefreshed({ uid: userId, e: data });
  }, [userId]);

  const value = useMemo<ProValue>(() => {
    const srv = fromServer(server);
    const pro = isProEntitlement(srv) || isProEntitlement(store);
    const shown = isProEntitlement(srv) ? srv : isProEntitlement(store) ? store : server ? srv : store;
    const preview = __DEV__ && devPreview;
    return {
      isPro: pro,
      status: shown.status,
      expiresAt: shown.expiresAt ?? null,
      devPreview: preview,
      setDevPreview: (v) => setDevPreviewState(__DEV__ && v),
      canOpenPro: pro || preview,
      refresh,
      setStoreEntitlement: setStore,
    };
  }, [server, store, devPreview, refresh, setStore]);
  return <ProContext.Provider value={value}>{children}</ProContext.Provider>;
}

export function usePro(): ProValue {
  const ctx = useContext(ProContext);
  if (!ctx) throw new Error('usePro must be used inside <ProProvider>');
  return ctx;
}
