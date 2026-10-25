/**
 * Public configuration only. `EXPO_PUBLIC_*` values are embedded in the app bundle and must never
 * contain secrets. AI provider keys, Supabase service-role keys and RevenueCat secret keys live only
 * on the server (Supabase Edge Function secrets).
 */
export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  revenueCatIosKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '',
  revenueCatAndroidKey: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '',
  privacyPolicyUrl: process.env.EXPO_PUBLIC_PRIVACY_URL ?? '',
  termsUrl: process.env.EXPO_PUBLIC_TERMS_URL ?? '',
  supportEmail: process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? '',
} as const;

export const isSupabaseConfigured = () => !!env.supabaseUrl && !!env.supabaseAnonKey;
