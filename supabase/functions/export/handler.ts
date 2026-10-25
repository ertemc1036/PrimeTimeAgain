import { verifyUser } from '../_shared/auth.ts';
import { asUser } from '../_shared/db.ts';
import { readEntitlement } from '../_shared/entitlement.ts';
import { error, json, preflight } from '../_shared/http.ts';
import { pull, type RemoteRecord } from '../_shared/records.ts';

/** GDPR-style export: everything stored for the caller in the cloud, as JSON. */
export async function handler(req: Request): Promise<Response> {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return error(405, 'method_not_allowed');
  const user = await verifyUser(req);
  if (!user) return error(401, 'signed_out');
  try {
    const records = await asUser(user.id, async (tx) => {
      const all: RemoteRecord[] = [];
      let cursor = 0;
      for (;;) {
        const page = await pull(tx, user.id, cursor, 1000);
        all.push(...page.records.filter((r) => !r.deleted));
        if (!page.more || !page.records.length) break;
        cursor = page.records[page.records.length - 1].seq;
      }
      return all;
    });
    const entitlement = await readEntitlement(user.id);
    return json({
      exportedAt: new Date().toISOString(),
      account: { id: user.id, email: user.email },
      subscription: entitlement ? { tier: entitlement.tier, status: entitlement.status, expiresAt: entitlement.expires_at, store: entitlement.store } : null,
      records: records.map(({ collection, id, data, updatedAt }) => ({ collection, id, data, updatedAt })),
      note: 'Progress photos are stored as private files and are listed by their storage path.',
    });
  } catch (e) {
    console.error('export failed', (e as Error).message);
    return error(500, 'export_failed');
  }
}
