#!/usr/bin/env node
/**
 * Writes .env.local for local testing (Expo Go / dev client) with the beta backend's public values
 * from eas.json (profile "development"). Keeps every other line already in .env.local.
 * Run: npm run env:beta
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const env = JSON.parse(readFileSync('eas.json', 'utf8')).build.development.env;
const keys = ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY'];
const kept = existsSync('.env.local')
  ? readFileSync('.env.local', 'utf8')
      .split('\n')
      .filter((l) => l.trim() && !keys.some((k) => l.startsWith(`${k}=`)))
  : [];
writeFileSync('.env.local', [...kept, ...keys.map((k) => `${k}=${env[k]}`)].join('\n') + '\n');
console.log(`.env.local updated: ${env.EXPO_PUBLIC_SUPABASE_URL} (public anon key from eas.json). Restart with: npx expo start --clear`);
