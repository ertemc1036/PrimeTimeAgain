import { verifyUser } from '../_shared/auth.ts';
import { accountEntitlement } from '../_shared/entitlement.ts';
import { error, json, preflight } from '../_shared/http.ts';

/** Re-check Pro status with RevenueCat (after a purchase or restore) and return it. */
export async function handler(req: Request): Promise<Response> {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return error(405, 'method_not_allowed');
  const user = await verifyUser(req);
  if (!user) return error(401, 'signed_out');
  try {
    return json(await accountEntitlement(user.id, { force: true }));
  } catch {
    return error(500, 'entitlement_failed');
  }
}
