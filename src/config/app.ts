import Constants from 'expo-constants';

export const APP_NAME = 'MINUS 30';
export const APP_VERSION = Constants.expoConfig?.version ?? '0.0.0';

/** Placeholder prices shown before the store provides real localised prices. */
export const PLACEHOLDER_PRICES = { monthly: '€5.99', yearly: '€39.99' } as const;

/** Official MINUS 30 Instagram account. */
export const INSTAGRAM_URL = 'https://www.instagram.com/minus30.app/';
export const INSTAGRAM_HANDLE = '@minus30.app';
