#!/usr/bin/env node
/**
 * Checks the dev bundle Expo Go loads for "Requiring unknown module" problems with dynamic import().
 *
 * With `npx expo start` running, it asks the dev server for the iOS manifest (like Expo Go), loads the
 * main bundle, and for every lazy import loads its split bundle and checks that it registers the
 * module ID the app will import. Read-only; it starts nothing.
 *
 *   node scripts/dev/check-lazy-bundles.mjs                 # dev server on http://127.0.0.1:8081
 *   node scripts/dev/check-lazy-bundles.mjs http://127.0.0.1:8083 android
 */
const server = (process.argv[2] ?? 'http://127.0.0.1:8081').replace(/\/+$/, '');
const platform = process.argv[3] ?? 'ios';

const manifest = await fetch(server, { headers: { 'expo-platform': platform, Accept: 'application/expo+json,application/json' } })
  .then((r) => r.json())
  .catch((e) => {
    console.error(`✗ No dev server at ${server} (${e.message}). Start it with: npx expo start --go`);
    process.exit(1);
  });
const bundleUrl = manifest.launchAsset?.url ?? manifest.bundleUrl;
// The manifest may name the LAN address; fetch through the address given here.
const mainUrl = server + new URL(bundleUrl).pathname + new URL(bundleUrl).search;
console.log(`Main bundle (${platform}), this can take a minute on the first run…`);
const main = await (await fetch(mainUrl)).text();

const defined = new Map();
for (const m of main.matchAll(/^\},(\d+),(?:\[[0-9,]*\]|\{.*\}),"([^"]+)"\);$/gm)) defined.set(Number(m[1]), m[2]);
const lazy = new Map();
for (const m of main.matchAll(/"paths":(\{[^}]*\})/g)) for (const [id, p] of Object.entries(JSON.parse(m[1]))) lazy.set(Number(id), p);
console.log(`${defined.size} modules, ${lazy.size} lazy imports\n`);

let broken = 0;
for (const [id, p] of lazy) {
  const entry = p.split('.bundle')[0];
  if (defined.has(id)) {
    console.log(`OK    ${id} ${entry} (already in the main bundle)`);
    continue;
  }
  const body = await (await fetch(server + p)).text();
  const registered = new Map();
  globalThis.__d = (_factory, moduleId, _deps, name) => registered.set(moduleId, name);
  try {
    (0, eval)(body);
  } catch (e) {
    console.log(`FAIL  ${id} ${entry}: split bundle does not evaluate (${e.message})`);
    broken++;
    continue;
  }
  if (registered.has(id)) console.log(`OK    ${id} ${entry}`);
  else {
    const other = [...registered].find(([, n]) => n?.startsWith(entry.slice(1) + '.'));
    console.log(`FAIL  ${id} ${entry}: split bundle registers ${other ? `${other[0]} ${other[1]}` : 'no matching module'} → "Requiring unknown module ${id}"`);
    broken++;
  }
}
console.log(broken ? `\n✗ ${broken} lazy import(s) would crash in Expo Go.` : '\n✓ All lazy imports resolve.');
process.exit(broken ? 1 : 0);
