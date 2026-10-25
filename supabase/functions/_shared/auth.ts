import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.118.0';

let admin: SupabaseClient | null = null;
/** Service-role client, used only for Auth admin calls and Storage. Never exposed to the app. */
export const adminClient = (): SupabaseClient =>
  (admin ??= createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  }));

export const bearer = (req: Request) => req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? '';

/** Verify the caller's access token with Supabase Auth. Returns the user id, or null. */
export async function verifyUser(req: Request): Promise<{ id: string; email?: string } | null> {
  const token = bearer(req);
  if (!token || token.split('.').length !== 3) return null;
  const { data, error } = await adminClient().auth.getUser(token);
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? undefined };
}
