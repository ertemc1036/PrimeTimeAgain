/**
 * Public configuration only. `EXPO_PUBLIC_*` values are embedded in the app bundle,
 * so they must never hold secrets (no service-role keys, no Anthropic or RevenueCat secret keys).
 */
export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
} as const;

export const isSupabaseConfigured = (): boolean => !!env.supabaseUrl && !!env.supabaseAnonKey;
