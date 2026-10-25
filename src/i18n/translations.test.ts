import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

import { LANGUAGES } from './languages';

type Tree = { [k: string]: string | string[] | Tree };
const load = (code: string): Tree => JSON.parse(readFileSync(join(__dirname, 'locales', `${code}.json`), 'utf8'));

const PLURAL = /_(zero|one|two|few|many|other)$/;
/** Plural forms each language must provide (from Intl.PluralRules, as i18next uses). */
const requiredForms = (code: string) => new Intl.PluralRules(code).resolvedOptions().pluralCategories.filter((c) => c !== 'zero' && c !== 'two' && c !== 'few');

function flatten(tree: Tree, prefix = '', out: Record<string, string | string[]> = {}) {
  for (const [k, v] of Object.entries(tree)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string' || Array.isArray(v)) out[key] = v;
    else flatten(v, key, out);
  }
  return out;
}
const placeholders = (s: string) => [...s.matchAll(/{{\s*(\w+)\s*}}/g)].map((m) => m[1]).sort();

const en = flatten(load('en'));
const baseKeys = (flat: Record<string, unknown>) => new Set(Object.keys(flat).map((k) => k.replace(PLURAL, '')));

describe.each(LANGUAGES.filter((l) => l.code !== 'en').map((l) => l.code))('%s translation', (code) => {
  const file = join(__dirname, 'locales', `${code}.json`);
  it('exists', () => expect(existsSync(file)).toBe(true));
  const flat = existsSync(file) ? flatten(load(code)) : {};

  it('has exactly the same keys as English', () => {
    const missing = [...baseKeys(en)].filter((k) => !baseKeys(flat).has(k));
    const extra = [...baseKeys(flat)].filter((k) => !baseKeys(en).has(k));
    expect({ missing, extra }).toEqual({ missing: [], extra: [] });
  });

  it('has every plural form the language needs', () => {
    const plurals = [...new Set(Object.keys(en).filter((k) => PLURAL.test(k)).map((k) => k.replace(PLURAL, '')))];
    const missing = plurals.flatMap((base) => requiredForms(code).filter((f) => !(`${base}_${f}` in flat)).map((f) => `${base}_${f}`));
    expect(missing).toEqual([]);
  });

  it('keeps the same placeholders and list lengths', () => {
    const problems: string[] = [];
    for (const [key, value] of Object.entries(flat)) {
      const source = en[key] ?? en[key.replace(PLURAL, '_other')];
      if (source === undefined) continue;
      if (Array.isArray(source)) {
        if (!Array.isArray(value) || value.length !== source.length) problems.push(`${key}: list length`);
        continue;
      }
      if (typeof value !== 'string' || !value.trim()) problems.push(`${key}: empty`);
      else if (placeholders(value).join() !== placeholders(source).join()) problems.push(`${key}: ${placeholders(value)} vs ${placeholders(source)}`);
    }
    expect(problems).toEqual([]);
  });
});
