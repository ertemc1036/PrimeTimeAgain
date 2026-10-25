import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { authAvailable, currentSession, onAuthChange } from '@/services/auth';
import { getSupabase } from '@/services/supabase/client';

export interface AuthUser {
  id: string;
  email: string | null;
}
interface AuthValue {
  /** Accounts need EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY; without them the app stays local-only. */
  configured: boolean;
  status: 'loading' | 'signedOut' | 'signedIn';
  user: AuthUser | null;
  /** Increases with every sign-in, also when the same account signs in again after its session ended. */
  signIns: number;
}

const AuthContext = createContext<AuthValue>({ configured: false, status: 'signedOut', user: null, signIns: 0 });

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = authAvailable();
  const [state, setState] = useState<Omit<AuthValue, 'configured'>>({ status: configured ? 'loading' : 'signedOut', user: null, signIns: 0 });

  useEffect(() => {
    if (!configured) return;
    let unsub: (() => void) | undefined;
    let alive = true;
    const set = (s: { user: { id: string; email?: string | null } } | null, event?: string) =>
      alive &&
      setState((prev) => ({
        status: s ? 'signedIn' : 'signedOut',
        user: s ? { id: s.user.id, email: s.user.email ?? null } : null,
        signIns: prev.signIns + (event === 'SIGNED_IN' ? 1 : 0),
      }));
    void currentSession().then((r) => set(r.ok ? r.value : null));
    void onAuthChange(set).then((u) => (unsub = u));
    // Refresh tokens only while the app is in the foreground (Supabase guidance for React Native).
    const sub = AppState.addEventListener('change', (s) => {
      void getSupabase().then((sb) => (s === 'active' ? sb?.auth.startAutoRefresh() : sb?.auth.stopAutoRefresh()));
    });
    return () => {
      alive = false;
      unsub?.();
      sub.remove();
    };
  }, [configured]);

  const value = useMemo(() => ({ configured, ...state }), [configured, state]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
