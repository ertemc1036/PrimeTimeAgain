import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

import type { AuthErrorCode, AuthResult } from '@/services/auth';
import { getSupabase } from '@/services/supabase/client';

/**
 * Sign in with Apple (native sheet with Face ID / Touch ID) → Supabase `signInWithIdToken`.
 *
 * Nonce: a fresh random value per attempt. Apple receives its SHA-256 (hex) and puts it into the
 * signed identity token; Supabase receives the raw value, hashes it and compares. A captured token
 * can therefore not be replayed without the raw nonce, which never leaves this function.
 *
 * Accounts: Supabase links an Apple ID automatically to an existing account with the same proven
 * email, so existing users keep their data. With "Hide My Email" Apple sends a private relay address
 * and a new account would be created; the account screen therefore offers "Link Apple" for signed-in
 * users (linkApple). The server refuses to attach Apple to an email account whose address was never
 * proven (protection against pre-registered accounts).
 */

export async function appleAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

type AppleCredential = { token: string; rawNonce: string; fullName: string | null };

/** 32 random bytes as hex; the hash of it goes to Apple, the value itself to Supabase. */
export async function createNonce(): Promise<{ raw: string; hashed: string }> {
  const raw = Array.from(Crypto.getRandomBytes(32), (b) => b.toString(16).padStart(2, '0')).join('');
  const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, raw, { encoding: Crypto.CryptoEncoding.HEX });
  return { raw, hashed };
}

async function appleCredential(): Promise<AppleCredential> {
  const nonce = await createNonce();
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
    nonce: nonce.hashed,
  });
  if (!credential.identityToken) throw Object.assign(new Error('Apple returned no identity token'), { code: 'ERR_REQUEST_FAILED' });
  // Apple sends the name only on the very first authorisation.
  const name = credential.fullName ? [credential.fullName.givenName, credential.fullName.familyName].filter(Boolean).join(' ').trim() : '';
  return { token: credential.identityToken, rawNonce: nonce.raw, fullName: name || null };
}

export function mapAppleError(e: unknown): AuthErrorCode {
  const err = e as { code?: string; status?: number; message?: string; name?: string };
  const code = err?.code ?? '';
  const msg = (err?.message ?? '').toLowerCase();
  if (code === 'ERR_REQUEST_CANCELED' || code === 'ERR_CANCELED') return 'cancelled';
  if (code === 'ERR_REQUEST_NOT_HANDLED' || code === 'ERR_REQUEST_NOT_INTERACTIVE' || code === 'ERR_APPLE_AUTHENTICATION_UNAVAILABLE') return 'apple_unavailable';
  if (err?.name === 'AuthRetryableFetchError' || msg.includes('network request failed') || msg.includes('failed to fetch')) return 'offline';
  if (code === 'identity_already_exists' || msg.includes('already linked')) return 'apple_linked_elsewhere';
  if (err?.status === 429 || code.startsWith('over_')) return 'rate_limited';
  // Server refusal while attaching Apple to an email account whose address isn't proven, or a
  // provider configuration problem: both are explained by the same message.
  if ((err?.status ?? 0) >= 500 || code === 'unexpected_failure' || msg.includes('database error')) return 'apple_account_exists';
  return 'apple_failed';
}

async function withSupabase<T>(fn: (sb: NonNullable<Awaited<ReturnType<typeof getSupabase>>>) => Promise<T>): Promise<AuthResult<T>> {
  const sb = await getSupabase();
  if (!sb) return { ok: false, error: 'not_configured' };
  try {
    return { ok: true, value: await fn(sb) };
  } catch (e) {
    return { ok: false, error: mapAppleError(e) };
  }
}

/** Sign in or create an account with Apple. `isNew` = this Apple ID just created a Diet9 account. */
export const signInWithApple = () =>
  withSupabase(async (sb) => {
    const cred = await appleCredential();
    const { data, error } = await sb.auth.signInWithIdToken({ provider: 'apple', token: cred.token, nonce: cred.rawNonce });
    if (error) throw error;
    const user = data.user!;
    if (cred.fullName && !user.user_metadata?.full_name) {
      // Best effort: keep the name Apple shares only once (stored in the account, not required).
      await sb.auth.updateUser({ data: { full_name: cred.fullName } }).catch(() => undefined);
    }
    const isNew = Date.now() - new Date(user.created_at).getTime() < 2 * 60 * 1000 && (user.identities ?? []).every((i) => i.provider === 'apple');
    return { isNew };
  });

/** Attach Apple to the signed-in account (e.g. an existing email account), so both sign-ins lead to it. */
export const linkApple = () =>
  withSupabase(async (sb) => {
    const cred = await appleCredential();
    const { error } = await sb.auth.linkIdentity({ provider: 'apple', token: cred.token, nonce: cred.rawNonce });
    if (error) throw error;
  });
