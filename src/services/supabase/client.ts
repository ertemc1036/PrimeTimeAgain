import type { SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import { env, isSupabaseConfigured } from '@/config/env';

/**
 * Supabase is optional. Without EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY the app runs local-only and
 * every cloud feature reports itself as "not configured" (never simulated).
 * Sessions are stored in the device keychain/keystore via expo-secure-store (chunked: values > 2 KB).
 */
let client: SupabaseClient | null = null;

const CHUNK = 1800;
const secureStorage = {
  async getItem(key: string) {
    const SecureStore = await import('expo-secure-store');
    const count = Number((await SecureStore.getItemAsync(`${key}.n`)) ?? '0');
    if (!count) return null;
    const parts = await Promise.all(Array.from({ length: count }, (_, i) => SecureStore.getItemAsync(`${key}.${i}`)));
    return parts.join('');
  },
  async setItem(key: string, value: string) {
    const SecureStore = await import('expo-secure-store');
    const parts = value.match(new RegExp(`.{1,${CHUNK}}`, 'gs')) ?? [''];
    await Promise.all(parts.map((p, i) => SecureStore.setItemAsync(`${key}.${i}`, p)));
    await SecureStore.setItemAsync(`${key}.n`, String(parts.length));
  },
  async removeItem(key: string) {
    const SecureStore = await import('expo-secure-store');
    const count = Number((await SecureStore.getItemAsync(`${key}.n`)) ?? '0');
    await Promise.all(Array.from({ length: count }, (_, i) => SecureStore.deleteItemAsync(`${key}.${i}`)));
    await SecureStore.deleteItemAsync(`${key}.n`);
  },
};

export async function getSupabase(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured()) return null;
  if (client) return client;
  const { createClient } = await import('@supabase/supabase-js');
  client = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      storage: Platform.OS === 'web' ? undefined : secureStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  return client;
}
