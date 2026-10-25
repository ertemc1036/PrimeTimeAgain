import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { FREE, isPro, type Entitlement } from '@/services/subscriptions/entitlements';

interface ProValue {
  /** Verified entitlement. Free until a store purchase is verified (RevenueCat isn't connected in this build). */
  entitlement: Entitlement;
  isPro: boolean;
  /** Development builds only: lets developers open Pro screens. Grants no AI access — the server decides. */
  devPreview: boolean;
  setDevPreview(v: boolean): void;
  /** Whether Pro screens should open (real Pro, or dev preview in development builds). */
  canOpenPro: boolean;
}

const ProContext = createContext<ProValue | null>(null);

export function ProProvider({ children }: { children: ReactNode }) {
  // A real build replaces FREE with the RevenueCat customer info, verified again on the server.
  const [entitlement] = useState<Entitlement>(FREE);
  const [devPreview, setDevPreviewState] = useState(false);
  const value = useMemo<ProValue>(() => {
    const pro = isPro(entitlement);
    const preview = __DEV__ && devPreview;
    return { entitlement, isPro: pro, devPreview: preview, setDevPreview: (v) => setDevPreviewState(__DEV__ && v), canOpenPro: pro || preview };
  }, [entitlement, devPreview]);
  return <ProContext.Provider value={value}>{children}</ProContext.Provider>;
}

export function usePro(): ProValue {
  const ctx = useContext(ProContext);
  if (!ctx) throw new Error('usePro must be used inside <ProProvider>');
  return ctx;
}
