import Constants from 'expo-constants';

export const APP_VERSION = Constants.expoConfig?.version ?? '0.0.0';

/** Prototype only: offers sample progress so every screen can be explored. Turn off before release. */
export const DEMO_MODE = true;
