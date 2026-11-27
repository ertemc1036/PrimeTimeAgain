import { proTestModeAllowed } from './testMode';

describe('Pro test mode availability', () => {
  it('is available in development builds', () => {
    expect(proTestModeAllowed({ dev: true })).toBe(true);
  });
  it('is available in internal test builds that set the flag', () => {
    expect(proTestModeAllowed({ dev: false, flag: '1', appEnv: 'preview' })).toBe(true);
  });
  it('is never available in production builds, even with the flag or in dev mode', () => {
    expect(proTestModeAllowed({ dev: false, flag: '1', appEnv: 'production' })).toBe(false);
    expect(proTestModeAllowed({ dev: true, flag: '1', appEnv: 'production' })).toBe(false);
  });
  it('is off in a store build without the flag', () => {
    expect(proTestModeAllowed({ dev: false })).toBe(false);
    expect(proTestModeAllowed({ dev: false, flag: '0' })).toBe(false);
  });
});
