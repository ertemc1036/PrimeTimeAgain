import { adminClient, verifyUser } from '../_shared/auth.ts';
import { error, json, preflight } from '../_shared/http.ts';

const BUCKETS = ['progress-photos', 'workout-photos'];

/** Permanently delete the caller's account: their private files, then the auth user (all rows cascade). */
export async function handler(req: Request): Promise<Response> {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return error(405, 'method_not_allowed');
  const user = await verifyUser(req);
  if (!user) return error(401, 'signed_out');
  const db = adminClient();

  for (const bucket of BUCKETS) {
    for (;;) {
      const { data: files, error: listError } = await db.storage.from(bucket).list(user.id, { limit: 1000 });
      if (listError) return error(500, 'storage_cleanup_failed');
      if (!files?.length) break;
      const { error: removeError } = await db.storage.from(bucket).remove(files.map((f) => `${user.id}/${f.name}`));
      if (removeError) return error(500, 'storage_cleanup_failed');
      if (files.length < 1000) break;
    }
  }
  const { error: deleteError } = await db.auth.admin.deleteUser(user.id);
  if (deleteError) return error(500, 'delete_failed');
  return json({ ok: true });
}
