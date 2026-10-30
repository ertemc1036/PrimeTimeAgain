import { createHash } from 'crypto';

import { linkApple, mapAppleError, signInWithApple } from './appleAuth';

const mockSignInAsync = jest.fn();
jest.mock('expo-apple-authentication', () => ({
  isAvailableAsync: jest.fn(async () => true),
  signInAsync: (...args: unknown[]) => mockSignInAsync(...args),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
}));
// Real cryptography, so the test checks the actual nonce relationship.
jest.mock('expo-crypto', () => ({
  getRandomBytes: (n: number) => new Uint8Array(require('crypto').randomBytes(n)),
  digestStringAsync: async (_alg: string, data: string) => require('crypto').createHash('sha256').update(data).digest('hex'),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  CryptoEncoding: { HEX: 'hex' },
}));
const mockAuth = { signInWithIdToken: jest.fn(), linkIdentity: jest.fn(), updateUser: jest.fn(async () => ({ data: {}, error: null })) };
let mockConfigured = true;
jest.mock('@/services/supabase/client', () => ({ getSupabase: jest.fn(async () => (mockConfigured ? { auth: mockAuth } : null)) }));

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');
const appleCredential = (over: Record<string, unknown> = {}) => ({ identityToken: 'apple.jwt.token', user: 'apple-user', fullName: { givenName: 'Ada', familyName: 'Lovelace' }, email: 'x@privaterelay.appleid.com', ...over });
const user = (over: Record<string, unknown> = {}) => ({ id: 'u1', created_at: new Date().toISOString(), user_metadata: {}, identities: [{ provider: 'apple' }], ...over });

beforeEach(() => {
  jest.clearAllMocks();
  mockConfigured = true;
  mockSignInAsync.mockResolvedValue(appleCredential());
  mockAuth.signInWithIdToken.mockResolvedValue({ data: { user: user(), session: {} }, error: null });
  mockAuth.linkIdentity.mockResolvedValue({ data: {}, error: null });
});

describe('Sign in with Apple', () => {
  it('sends the SHA-256 of a fresh nonce to Apple and the raw nonce to Supabase', async () => {
    const r = await signInWithApple();
    expect(r).toEqual({ ok: true, value: { isNew: true } });
    const appleOptions = mockSignInAsync.mock.calls[0][0];
    expect(appleOptions.requestedScopes).toEqual([0, 1]);
    const supabaseArgs = mockAuth.signInWithIdToken.mock.calls[0][0];
    expect(supabaseArgs).toMatchObject({ provider: 'apple', token: 'apple.jwt.token' });
    expect(supabaseArgs.nonce).toMatch(/^[0-9a-f]{64}$/);
    expect(appleOptions.nonce).toBe(sha256(supabaseArgs.nonce));
    expect(appleOptions.nonce).not.toBe(supabaseArgs.nonce);
  });

  it('uses a new nonce for every attempt', async () => {
    await signInWithApple();
    await signInWithApple();
    const [a, b] = mockAuth.signInWithIdToken.mock.calls.map((c) => c[0].nonce);
    expect(a).not.toBe(b);
  });

  it('keeps the name Apple shares only once, and recognises existing accounts', async () => {
    await signInWithApple();
    expect(mockAuth.updateUser).toHaveBeenCalledWith({ data: { full_name: 'Ada Lovelace' } });
    mockAuth.signInWithIdToken.mockResolvedValue({ data: { user: user({ created_at: '2026-01-01T00:00:00Z', identities: [{ provider: 'email' }, { provider: 'apple' }] }), session: {} }, error: null });
    mockSignInAsync.mockResolvedValue(appleCredential({ fullName: null }));
    expect(await signInWithApple()).toEqual({ ok: true, value: { isNew: false } });
    expect(mockAuth.updateUser).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['cancelled sheet', () => mockSignInAsync.mockRejectedValue(Object.assign(new Error('canceled'), { code: 'ERR_REQUEST_CANCELED' })), 'cancelled'],
    ['missing identity token', () => mockSignInAsync.mockResolvedValue(appleCredential({ identityToken: null })), 'apple_failed'],
    ['offline', () => mockAuth.signInWithIdToken.mockResolvedValue({ data: {}, error: Object.assign(new Error('Network request failed'), { name: 'AuthRetryableFetchError' }) }), 'offline'],
    ['server refusal (e.g. unproven email account)', () => mockAuth.signInWithIdToken.mockResolvedValue({ data: {}, error: Object.assign(new Error('Database error saving new user'), { status: 500 }) }), 'apple_account_exists'],
    ['rate limit', () => mockAuth.signInWithIdToken.mockResolvedValue({ data: {}, error: Object.assign(new Error('too many'), { status: 429 }) }), 'rate_limited'],
  ])('reports %s', async (_label, arrange, expected) => {
    arrange();
    expect(await signInWithApple()).toEqual({ ok: false, error: expected });
  });

  it('never calls Supabase when the user cancels', async () => {
    mockSignInAsync.mockRejectedValue(Object.assign(new Error('canceled'), { code: 'ERR_REQUEST_CANCELED' }));
    await signInWithApple();
    expect(mockAuth.signInWithIdToken).not.toHaveBeenCalled();
  });

  it('is unavailable without Supabase', async () => {
    mockConfigured = false;
    expect(await signInWithApple()).toEqual({ ok: false, error: 'not_configured' });
    expect(mockSignInAsync).not.toHaveBeenCalled();
  });
});

describe('Link Apple to the signed-in account', () => {
  it('links with the same nonce scheme', async () => {
    expect(await linkApple()).toEqual({ ok: true, value: undefined });
    const args = mockAuth.linkIdentity.mock.calls[0][0];
    expect(args).toMatchObject({ provider: 'apple', token: 'apple.jwt.token' });
    expect(mockSignInAsync.mock.calls[0][0].nonce).toBe(sha256(args.nonce));
  });

  it('explains when the Apple ID already belongs to another account', async () => {
    mockAuth.linkIdentity.mockResolvedValue({ data: {}, error: Object.assign(new Error('Identity is already linked to another user'), { code: 'identity_already_exists', status: 422 }) });
    expect(await linkApple()).toEqual({ ok: false, error: 'apple_linked_elsewhere' });
  });

  it('maps unknown errors to a generic Apple error', () => {
    expect(mapAppleError(new Error('something odd'))).toBe('apple_failed');
  });
});
