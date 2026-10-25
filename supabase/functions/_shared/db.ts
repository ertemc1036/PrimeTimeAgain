import postgres from 'npm:postgres@3.4.9';

/**
 * Direct Postgres access for Edge Functions. SUPABASE_DB_URL is provided to every hosted function.
 * `prepare: false` keeps it compatible with Supabase's transaction-mode connection pooler.
 */
let pool: postgres.Sql | null = null;
export const sql = (): postgres.Sql =>
  (pool ??= postgres(Deno.env.get('SUPABASE_DB_URL')!, { prepare: false, max: 4, idle_timeout: 20, connect_timeout: 10 }));

export type Tx = postgres.TransactionSql;

/**
 * Run `fn` in a transaction as the signed-in user: role `authenticated` with the user's JWT claims,
 * so every statement is subject to row-level security exactly like a client request.
 */
export function asUser<T>(userId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  const claims = JSON.stringify({ sub: userId, role: 'authenticated' });
  return sql().begin(async (tx) => {
    await tx`select set_config('request.jwt.claims', ${claims}, true), set_config('request.jwt.claim.sub', ${userId}, true), set_config('role', 'authenticated', true)`;
    return fn(tx);
  }) as Promise<T>;
}
