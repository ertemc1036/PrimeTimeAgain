import { readFileSync } from 'fs';
import { join } from 'path';

/** The Edge Functions validate AI output with the same schemas as the app. */
describe('AI schemas', () => {
  it('are identical in the app and the Edge Functions (apart from the zod import)', () => {
    const strip = (s: string) => s.replace(/^import \{ z \} from .*$/m, '').trim();
    const app = readFileSync(join(__dirname, 'aiSchemas.ts'), 'utf8');
    const server = readFileSync(join(__dirname, '../../supabase/functions/_shared/schemas.ts'), 'utf8');
    expect(strip(server)).toBe(strip(app));
  });
});
