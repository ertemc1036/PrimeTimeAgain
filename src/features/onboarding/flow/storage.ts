import { Platform } from 'react-native';

/**
 * Encrypted local storage for the onboarding draft (health-related answers before an account
 * exists): iOS Keychain / Android Keystore via expo-secure-store. Web preview: browser storage.
 * The draft is small (well below SecureStore's 2 KB guideline) and deleted once it is saved to the
 * account or when the user starts over.
 */
const KEY = 'primeme.onboarding.v2';

export async function loadDraft<T>(): Promise<T | null> {
  try {
    const raw = Platform.OS === 'web' ? globalThis.localStorage?.getItem(KEY) : await (await import('expo-secure-store')).getItemAsync(KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function saveDraft(value: unknown): Promise<void> {
  try {
    const raw = JSON.stringify(value);
    if (Platform.OS === 'web') globalThis.localStorage?.setItem(KEY, raw);
    else await (await import('expo-secure-store')).setItemAsync(KEY, raw);
  } catch {
    // Not fatal: the answers stay in memory for this session.
  }
}

export async function clearDraft(): Promise<void> {
  try {
    if (Platform.OS === 'web') globalThis.localStorage?.removeItem(KEY);
    else await (await import('expo-secure-store')).deleteItemAsync(KEY);
  } catch {
    // ignore
  }
}
