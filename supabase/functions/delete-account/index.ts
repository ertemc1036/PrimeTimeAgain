import { admin } from '../_shared/guard.ts';
import { corsHeaders, error, json } from '../_shared/http.ts';

/** Permanently delete the caller's account: storage files, then the auth user (rows cascade). */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return error(401, 'signed_out');
  const db = admin();
  const { data, error: authError } = await db.auth.getUser(token);
  if (authError || !data.user) return error(401, 'signed_out');
  const userId = data.user.id;

  for (const bucket of ['progress-photos', 'workout-photos']) {
    const { data: files } = await db.storage.from(bucket).list(userId, { limit: 1000 });
    if (files?.length) await db.storage.from(bucket).remove(files.map((f) => `${userId}/${f.name}`));
  }
  const { error: deleteError } = await db.auth.admin.deleteUser(userId);
  if (deleteError) return error(500, 'delete_failed');
  return json({ ok: true });
});
