import fs from 'fs';
import path from 'path';

/**
 * In development on iOS/Android, Metro loads each `import('pkg')` as a separate bundle whose URL is
 * the target file WITHOUT its extension (see @expo/metro-config serializer/fork/js.js). The dev
 * server resolves that path again by trying the source extensions in order. If another file with the
 * same name wins (e.g. dist/index.mjs before dist/index.cjs), the split bundle contains a different
 * module and the app crashes with "Requiring unknown module". This test re-creates that lookup for
 * every dynamic import in src/ and fails if the round trip lands on a different file.
 */
const root = path.join(__dirname, '../..');
// Order from expo/metro-config's default resolver.sourceExts; platform variants come first per extension.
const SOURCE_EXTS = ['ts', 'tsx', 'mjs', 'js', 'jsx', 'json', 'cjs'];
const PLATFORMS = ['ios', 'android'];

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return sourceFiles(p);
    return /\.(ts|tsx)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [p] : [];
  });
}

/** Pick an `exports` target the way Metro does for a native app (first matching condition in object order). */
function pickCondition(entry: unknown): string | null {
  if (typeof entry === 'string') return entry;
  if (!entry || typeof entry !== 'object') return null;
  for (const [key, value] of Object.entries(entry)) {
    if (['react-native', 'import', 'require', 'default'].includes(key)) {
      const r = pickCondition(value);
      if (r) return r;
    }
  }
  return null;
}

/** File a package specifier resolves to in the main bundle. */
function resolvePackage(specifier: string): string | null {
  const parts = specifier.split('/');
  const name = specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
  const sub = specifier.slice(name.length);
  const dir = path.join(root, 'node_modules', name);
  const pkgFile = path.join(dir, 'package.json');
  if (!fs.existsSync(pkgFile)) return null;
  const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8'));
  let target: string | null = null;
  if (pkg.exports) {
    const exp = typeof pkg.exports === 'string' || !Object.keys(pkg.exports).some((k) => k.startsWith('.')) ? { '.': pkg.exports } : pkg.exports;
    target = pickCondition(exp['.' + sub]);
  }
  if (!target && !sub) target = pkg['react-native'] ?? pkg.main ?? 'index.js';
  if (!target) target = '.' + sub;
  let file = path.join(dir, target);
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = firstMatch(fs.existsSync(file) ? path.join(file, 'index') : file) ?? file;
  return fs.existsSync(file) ? file : null;
}

/** What Metro's dev server finds for an extensionless path. */
function firstMatch(base: string): string | null {
  for (const ext of SOURCE_EXTS) {
    for (const platform of [...PLATFORMS, 'native', '']) {
      const candidate = `${base}${platform ? '.' + platform : ''}.${ext}`;
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return null;
}

describe('dynamic import() targets survive Metro split-bundle URLs', () => {
  const specifiers = new Set<string>();
  for (const f of sourceFiles(path.join(root, 'src'))) {
    for (const m of fs.readFileSync(f, 'utf8').matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g)) {
      if (!m[1].startsWith('.') && !m[1].startsWith('@/')) specifiers.add(m[1]);
    }
  }

  it('finds the dynamic imports to check', () => {
    expect(specifiers.size).toBeGreaterThan(0);
  });

  it.each([...specifiers])('%s', (specifier) => {
    const file = resolvePackage(specifier);
    expect(file).not.toBeNull();
    const base = file!.slice(0, -path.extname(file!).length);
    // Platform-specific files (e.g. index.ios.js) are what Metro picks on that platform, so compare against the base lookup.
    expect(path.relative(root, firstMatch(base) ?? '')).toBe(path.relative(root, file!));
  });

  it('flags the @supabase/supabase-js case that crashed Expo Go', () => {
    const file = resolvePackage('@supabase/supabase-js')!;
    expect(path.basename(file)).toBe('index.cjs');
    expect(path.basename(firstMatch(file.slice(0, -4))!)).toBe('index.mjs');
  });
});
