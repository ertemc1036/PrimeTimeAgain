import de from './locales/de.json';
import en from './locales/en.json';
import tr from './locales/tr.json';
import { LANGUAGES, matchLanguage } from './languages';

type Tree = { [key: string]: string | Tree };

const flatten = (tree: Tree, prefix = ''): Record<string, string> =>
  Object.entries(tree).reduce<Record<string, string>>((acc, [k, v]) => {
    const key = prefix ? `${prefix}.${k}` : k;
    return typeof v === 'string' ? { ...acc, [key]: v } : { ...acc, ...flatten(v, key) };
  }, {});

const placeholders = (s: string) => (s.match(/{{\s*\w+\s*}}/g) ?? []).map((p) => p.replace(/\s/g, '')).sort();

const source = flatten(en as unknown as Tree);
const locales: Record<string, Tree> = { de: de as unknown as Tree, tr: tr as unknown as Tree };

describe('translations', () => {
  it('registers a locale file for every language', () => {
    for (const lang of LANGUAGES) {
      if (lang.code !== 'en') expect(locales[lang.code]).toBeDefined();
    }
  });

  describe.each(Object.keys(locales))('%s', (code) => {
    const target = flatten(locales[code]);

    it('has exactly the same keys as English', () => {
      expect(Object.keys(target).sort()).toEqual(Object.keys(source).sort());
    });

    it('keeps the same {{placeholders}}', () => {
      for (const key of Object.keys(source)) {
        expect([key, placeholders(target[key] ?? '')]).toEqual([key, placeholders(source[key])]);
      }
    });

    it('has no empty strings', () => {
      for (const [key, value] of Object.entries(target)) expect([key, value.trim().length > 0]).toEqual([key, true]);
    });
  });
});

describe('matchLanguage', () => {
  it('picks the first supported device language', () => {
    expect(matchLanguage(['fr-FR', 'de-AT', 'en-US'])).toBe('de');
    expect(matchLanguage(['tr'])).toBe('tr');
  });
  it('falls back to English', () => {
    expect(matchLanguage(['ja-JP', null, undefined])).toBe('en');
    expect(matchLanguage([])).toBe('en');
  });
});
