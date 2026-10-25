// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // Edge Functions run on Deno and are checked with `deno check` instead.
    ignores: ['dist/*', '.expo/*', 'supabase/functions/*'],
  },
]);
