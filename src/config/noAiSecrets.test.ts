import fs from 'fs';
import path from 'path';

/**
 * The app must never hold an AI provider key or call an AI provider directly: all AI requests go
 * through our Supabase Edge Functions, which keep OPENAI_API_KEY / ANTHROPIC_API_KEY as secrets.
 */
const root = path.join(__dirname, '..');
function files(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return files(p);
    return /\.(ts|tsx|js|json)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [p] : [];
  });
}

describe('no AI secrets or direct AI calls in the app', () => {
  const sources = files(root).map((f) => ({ f, text: fs.readFileSync(f, 'utf8') }));

  it.each([
    ['an OpenAI key variable', /EXPO_PUBLIC_[A-Z_]*OPENAI|OPENAI_API_KEY/],
    ['an Anthropic key variable', /EXPO_PUBLIC_[A-Z_]*ANTHROPIC|ANTHROPIC_API_KEY/],
    ['a secret key value', /\bsk-(proj-|ant-)?[A-Za-z0-9_-]{16,}/],
    ['a direct OpenAI request', /api\.openai\.com/],
    ['a direct Anthropic request', /api\.anthropic\.com/],
  ])('contains no %s', (_label, pattern) => {
    expect(sources.filter((s) => pattern.test(s.text)).map((s) => path.relative(root, s.f))).toEqual([]);
  });

  it('has no EXPO_PUBLIC AI variable in the env templates', () => {
    for (const f of ['.env.example', 'eas.json', 'app.json']) {
      const p = path.join(root, '..', f);
      if (fs.existsSync(p)) expect(fs.readFileSync(p, 'utf8')).not.toMatch(/OPENAI|ANTHROPIC_API_KEY|\bsk-[A-Za-z0-9]/);
    }
  });
});
