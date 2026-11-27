/**
 * Pro test mode: lets the owner try every Pro screen without a subscription.
 *
 * - Available only in development builds (Expo Go / dev client, `__DEV__`) and in internal test builds
 *   that set EXPO_PUBLIC_PRO_TEST_MODE=1 (eas.json "development" and "preview" profiles). Never in a
 *   build whose EXPO_PUBLIC_APP_ENV is "production" (the "production" profile), whatever else is set.
 * - It is a UI switch only. It opens Pro screens and hides paywalls in the app; it grants no AI access.
 *   The server decides alone: AI features work for accounts whose user id is in the PRO_TESTERS secret
 *   (or that have a real subscription / founder seat). See docs/PRO_TEST_MODE.md.
 */
export function proTestModeAllowed(opts: { dev: boolean; flag?: string; appEnv?: string }): boolean {
  if (opts.appEnv === 'production') return false;
  return opts.dev || opts.flag === '1';
}

export const PRO_TEST_MODE_ALLOWED = proTestModeAllowed({
  dev: typeof __DEV__ !== 'undefined' && __DEV__,
  flag: process.env.EXPO_PUBLIC_PRO_TEST_MODE,
  appEnv: process.env.EXPO_PUBLIC_APP_ENV,
});
