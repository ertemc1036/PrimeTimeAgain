import { verifyUser } from '../_shared/auth.ts';
import { asUser } from '../_shared/db.ts';
import { currentEntitlement, publicEntitlement } from '../_shared/entitlement.ts';
import { error, json, preflight, readJson } from '../_shared/http.ts';
import { applyChange, pull, type Change, type ChangeResult, type RemoteRecord } from '../_shared/records.ts';

const MAX_CHANGES = 500;

/**
 * POST { cursor, changes[] } → { results[], winners[], records[], cursor, more, entitlement }
 * Pushes local changes (last-write-wins), then returns everything newer than `cursor`.
 * Runs in one transaction as the user, so row-level security applies throughout.
 */
export async function handler(req: Request): Promise<Response> {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return error(405, 'method_not_allowed');
  const user = await verifyUser(req);
  if (!user) return error(401, 'signed_out');
  const body = await readJson(req, 6 * 1024 * 1024);
  if (!body) return error(400, 'invalid_request');
  const cursor = Number.isSafeInteger(body.cursor) && (body.cursor as number) >= 0 ? (body.cursor as number) : 0;
  const changes = Array.isArray(body.changes) ? (body.changes as Change[]) : [];
  if (changes.length > MAX_CHANGES) return error(413, 'too_many_changes', { max: MAX_CHANGES });

  try {
    const out = await asUser(user.id, async (tx) => {
      // Serialise this user's syncs so sequence numbers are committed in order (no missed rows on pull).
      await tx`select pg_advisory_xact_lock(hashtext(${'sync:' + user.id}))`;
      const results: ChangeResult[] = [];
      const winners: RemoteRecord[] = [];
      for (const c of changes) {
        const r = await applyChange(tx, user.id, c);
        results.push(r.result);
        if (r.winner) winners.push(r.winner);
      }
      const page = await pull(tx, user.id, cursor);
      const next = page.records.length ? page.records[page.records.length - 1].seq : cursor;
      return { results, winners, records: page.records, cursor: next, more: page.more };
    });
    const entitlement = publicEntitlement(await currentEntitlement(user.id));
    return json({ ...out, entitlement });
  } catch (e) {
    console.error('sync failed', (e as Error).message);
    return error(500, 'sync_failed');
  }
}
