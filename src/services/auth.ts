import { createClient, type Session } from '@supabase/supabase-js';

import { env, isSupabaseConfigured } from '@/config/env';

import { getSupabase } from './supabase/client';

/**
 * Email/password accounts through Supabase Auth. Codes (6 digits) are used for email confirmation
 * and password reset, so no deep links are needed on the phone.
 */
export type AuthErrorCode =
  | 'not_configured'
  | 'invalid_credentials'
  | 'email_not_confirmed'
  | 'user_exists'
  | 'weak_password'
  | 'invalid_email'
  | 'invalid_code'
  | 'rate_limited'
  | 'offline'
  | 'unknown';

export type AuthResult<T = void> = { ok: true; value: T } | { ok: false; error: AuthErrorCode };

export const authAvailable = () => isSupabaseConfigured();

function mapError(e: unknown): AuthErrorCode {
  const err = e as { code?: string; status?: number; message?: string; name?: string };
  const code = err?.code ?? '';
  const msg = (err?.message ?? '').toLowerCase();
  if (err?.name === 'AuthRetryableFetchError' || msg.includes('network request failed') || msg.includes('failed to fetch')) return 'offline';
  if (code === 'invalid_credentials' || msg.includes('invalid login')) return 'invalid_credentials';
  if (code === 'email_not_confirmed') return 'email_not_confirmed';
  if (code === 'user_already_exists' || code === 'email_exists' || msg.includes('already registered')) return 'user_exists';
  if (code === 'weak_password' || msg.includes('password should')) return 'weak_password';
  if (code === 'email_address_invalid' || code === 'validation_failed') return 'invalid_email';
  if (code === 'otp_expired' || msg.includes('token has expired') || msg.includes('invalid')) return 'invalid_code';
  if (err?.status === 429 || code.startsWith('over_')) return 'rate_limited';
  return 'unknown';
}

async function run<T>(fn: (sb: NonNullable<Awaited<ReturnType<typeof getSupabase>>>) => Promise<T>): Promise<AuthResult<T>> {
  const sb = await getSupabase();
  if (!sb) return { ok: false, error: 'not_configured' };
  try {
    return { ok: true, value: await fn(sb) };
  } catch (e) {
    return { ok: false, error: mapError(e) };
  }
}
const check = <T extends { error: unknown }>(r: T) => {
  if (r.error) throw r.error;
  return r;
};

export const currentSession = () => run(async (sb) => (await sb.auth.getSession()).data.session);

export function onAuthChange(fn: (session: Session | null, event: string) => void): Promise<() => void> {
  return getSupabase().then((sb) => {
    if (!sb) return () => undefined;
    const { data } = sb.auth.onAuthStateChange((event, session) => fn(session, event));
    return () => data.subscription.unsubscribe();
  });
}

export const signIn = (email: string, password: string) =>
  run(async (sb) => check(await sb.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })).data.session);

/** Returns `needsCode: true` when the project requires email confirmation (enter the emailed code next). */
export const signUp = (email: string, password: string) =>
  run(async (sb) => {
    const r = check(await sb.auth.signUp({ email: email.trim().toLowerCase(), password }));
    return { needsCode: !r.data.session };
  });

export const confirmSignUp = (email: string, code: string) =>
  run(async (sb) => check(await sb.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: 'signup' })).data.session);

export const resendSignUpCode = (email: string) => run(async (sb) => void check(await sb.auth.resend({ type: 'signup', email: email.trim().toLowerCase() })));

export const requestPasswordReset = (email: string) => run(async (sb) => void check(await sb.auth.resetPasswordForEmail(email.trim().toLowerCase())));

/**
 * Verify the emailed recovery code and set the new password on a throwaway, in-memory client, then
 * sign in normally. The app therefore sees one clean sign-in (like the sign-in screen), and no
 * recovery session is ever stored on the device.
 */
export const resetPassword = (email: string, code: string, newPassword: string) =>
  run(async (sb) => {
    const address = email.trim().toLowerCase();
    const temp = createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'm30-password-reset' },
    });
    try {
      check(await temp.auth.verifyOtp({ email: address, token: code.trim(), type: 'recovery' }));
      check(await temp.auth.updateUser({ password: newPassword }));
    } finally {
      await temp.auth.signOut({ scope: 'local' }).catch(() => undefined);
    }
    return check(await sb.auth.signInWithPassword({ email: address, password: newPassword })).data.session;
  });

export const signOut = () => run(async (sb) => void (await sb.auth.signOut({ scope: 'local' })));

/** Permanently delete the account and all cloud data (server side), then end the session. */
export const deleteAccount = () =>
  run(async (sb) => {
    const { error } = await sb.functions.invoke('delete-account', { body: {} });
    if (error) throw error;
    await sb.auth.signOut({ scope: 'local' });
  });

/** Download the cloud copy of the user's data (GDPR export). */
export const exportCloudData = () =>
  run(async (sb) => {
    const { data, error } = await sb.functions.invoke('export', { body: {} });
    if (error) throw error;
    return data as unknown;
  });

export const PASSWORD_MIN = 8;
export const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim());
