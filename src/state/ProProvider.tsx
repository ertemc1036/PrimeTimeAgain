import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { PRO_TEST_MODE_ALLOWED } from '@/config/testMode';

import { getSupabase } from '@/services/supabase/client';
import { FREE, isPro as isProEntitlement, type Entitlement } from '@/services/subscriptions/entitlements';
import { identify, onCustomerInfo } from '@/services/subscriptions/revenuecat';
import type { ProSource, ServerEntitlement } from '@/sync/protocol';

import { useAuth } from './AuthProvider';
import { useSync } from './SyncProvider';

interface ProValue {
  /** Pro as far as this device can tell (server-verified entitlement or a fresh store purchase). */
  isPro: boolean;
  /** Status details for the account screen and paywall. */
  status: Entitlement['status'];
  expiresAt: string | null;
  /** Where active Pro comes from (decided by the server; see ProSource). */
  access: ProSource | null;
  /** Founder seat number for Founders Pro. */
  founderSeat: number | null;
  /** Server view: is the account's identity proven? null = not known yet (offline, signed out). */
  identityVerified: boolean | null;
  /** The Pro test mode switch exists in this build (development / internal test builds only). */
  testModeAllowed: boolean;
  /**
   * Pro test mode is on: Pro screens open and paywalls stay out of the way. UI only – grants no AI
   * access; the server decides (PRO_TESTERS). See src/config/testMode.ts.
   */
  testMode: boolean;
  setTestMode(v: boolean): void;
  /** Pro screens may open (real Pro or test mode). */
  canOpenPro: boolean;
  /** Paywalls and upgrade prompts may be shown (no real Pro and test mode off). */
  showPaywalls: boolean;
  /** Ask the server for the current entitlement (after purchase/restore, or to pick up a founder seat). */
  refresh(): Promise<ServerEntitlement | null>;
  /** Apply the entitlement returned by a purchase or restore immediately. */
  setStoreEntitlement(e: Entitlement): void;
}

const ProContext = createContext<ProValue | null>(null);
const TEST_MODE_KEY = 'primeme.proTestMode';

const fromServer = (e: ServerEntitlement | null): Entitlement =>
  e ? { tier: e.tier, status: e.status, source: 'revenuecat', expiresAt: e.expiresAt ?? undefined, productId: e.productId ?? undefined } : FREE;

export function ProProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const sync = useSync();
  const userId = auth.status === 'signedIn' ? (auth.user?.id ?? null) : null;
  // Values are tagged with the account they belong to, so nothing carries over to another account.
  const [refreshed, setRefreshed] = useState<{ uid: string; e: ServerEntitlement } | null>(null);
  const [storeState, setStoreState] = useState<{ uid: string | null; e: Entitlement }>({ uid: null, e: FREE });
  // Test mode is on by default where it is allowed, and remembered on this device when switched off.
  const [testModeOn, setTestModeOn] = useState(PRO_TEST_MODE_ALLOWED);
  useEffect(() => {
    if (!PRO_TEST_MODE_ALLOWED) return;
    void AsyncStorage.getItem(TEST_MODE_KEY)
      .then((v) => v !== null && setTestModeOn(v === '1'))
      .catch(() => undefined);
  }, []);
  const setTestMode = useCallback((v: boolean) => {
    if (!PRO_TEST_MODE_ALLOWED) return;
    setTestModeOn(v);
    void AsyncStorage.setItem(TEST_MODE_KEY, v ? '1' : '0').catch(() => undefined);
  }, []);
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
    if (!sb || !userId) return null;
    const { data } = await sb.functions.invoke<ServerEntitlement>('entitlement', { body: {} });
    if (data?.tier) setRefreshed({ uid: userId, e: data });
    return data?.tier ? data : null;
  }, [userId]);

  const value = useMemo<ProValue>(() => {
    const srv = fromServer(server);
    const pro = isProEntitlement(srv) || isProEntitlement(store);
    const shown = isProEntitlement(srv) ? srv : isProEntitlement(store) ? store : server ? srv : store;
    const testMode = PRO_TEST_MODE_ALLOWED && testModeOn;
    return {
      isPro: pro,
      status: shown.status,
      expiresAt: shown.expiresAt ?? null,
      access: isProEntitlement(srv) ? (server?.source ?? 'store') : isProEntitlement(store) ? 'store' : null,
      founderSeat: isProEntitlement(srv) && server?.source === 'founder' ? (server.founderSeat ?? null) : null,
      identityVerified: typeof server?.identityVerified === 'boolean' ? server.identityVerified : null,
      testModeAllowed: PRO_TEST_MODE_ALLOWED,
      testMode,
      setTestMode,
      canOpenPro: pro || testMode,
      showPaywalls: !pro && !testMode,
      refresh,
      setStoreEntitlement: setStore,
    };
  }, [server, store, testModeOn, setTestMode, refresh, setStore]);
  return <ProContext.Provider value={value}>{children}</ProContext.Provider>;
}

export function usePro(): ProValue {
  const ctx = useContext(ProContext);
  if (!ctx) throw new Error('usePro must be used inside <ProProvider>');
  return ctx;
}
