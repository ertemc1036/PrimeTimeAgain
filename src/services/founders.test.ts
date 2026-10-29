import { fetchFounderStatus } from './founders';

const mockInvoke = jest.fn();
jest.mock('@/services/supabase/client', () => ({ getSupabase: jest.fn(async () => (mockConfigured ? { functions: { invoke: mockInvoke } } : null)) }));
let mockConfigured = true;

describe('founder counter', () => {
  beforeEach(() => {
    mockInvoke.mockReset();
    mockConfigured = true;
  });

  it('returns the server numbers', async () => {
    mockInvoke.mockResolvedValue({ data: { capacity: 1000, taken: 742, remaining: 258 }, error: null });
    await expect(fetchFounderStatus()).resolves.toEqual({ capacity: 1000, taken: 742, remaining: 258 });
    expect(mockInvoke).toHaveBeenCalledWith('founders', { method: 'GET' });
  });

  it.each([
    ['an error', { data: null, error: new Error('offline') }],
    ['a malformed answer', { data: { taken: '742' }, error: null }],
    ['negative numbers', { data: { capacity: 1000, taken: -1, remaining: 1001 }, error: null }],
  ])('shows nothing (no made-up numbers) on %s', async (_label, answer) => {
    mockInvoke.mockResolvedValue(answer);
    await expect(fetchFounderStatus()).resolves.toBeNull();
  });

  it('shows nothing when Supabase is not set up', async () => {
    mockConfigured = false;
    await expect(fetchFounderStatus()).resolves.toBeNull();
    expect(mockInvoke).not.toHaveBeenCalled();
  });
});
