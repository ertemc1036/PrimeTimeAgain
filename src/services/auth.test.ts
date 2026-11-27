import { mapError } from './auth';

jest.mock('./supabase/client', () => ({ getSupabase: async () => null }));

describe('auth error messages', () => {
  it('reports a rejected API key as a configuration problem, not as a wrong code', () => {
    expect(mapError({ status: 401, message: 'Invalid API key' })).toBe('server_config');
    expect(mapError({ message: 'No API key found in request' })).toBe('server_config');
  });
  it('maps the usual sign-up and sign-in errors', () => {
    expect(mapError({ code: 'invalid_credentials', status: 400, message: 'Invalid login credentials' })).toBe('invalid_credentials');
    expect(mapError({ code: 'user_already_exists', status: 422 })).toBe('user_exists');
    expect(mapError({ code: 'weak_password', status: 422 })).toBe('weak_password');
    expect(mapError({ code: 'email_address_invalid', status: 400 })).toBe('invalid_email');
    expect(mapError({ code: 'email_not_confirmed', status: 400 })).toBe('email_not_confirmed');
    expect(mapError({ code: 'over_email_send_rate_limit', status: 429 })).toBe('rate_limited');
  });
  it('maps only real code errors to "invalid code"', () => {
    expect(mapError({ code: 'otp_expired', status: 403, message: 'Token has expired or is invalid' })).toBe('invalid_code');
    expect(mapError({ status: 400, message: 'Something invalid happened' })).toBe('unknown');
  });
  it('detects missing network', () => {
    expect(mapError({ name: 'AuthRetryableFetchError', message: 'Network request failed' })).toBe('offline');
  });
});
