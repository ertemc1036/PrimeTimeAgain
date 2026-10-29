import { verifyUser } from './auth.ts';
import { currentEntitlement, isProActive } from './entitlement.ts';
import { error } from './http.ts';
import { consumeQuota } from './quota.ts';

/**
 * Gate for AI functions: valid session → verified Pro entitlement (server data only, never the
 * app's word) → rate limit. Returns the user id or an error Response.
 */
export async function requirePro(req: Request, fn: string): Promise<{ userId: string } | Response> {
  const user = await verifyUser(req);
  if (!user) return error(401, 'signed_out');
  const ent = await currentEntitlement(user.id);
  if (!isProActive(ent)) return error(403, 'not_pro');
  if (!(await consumeQuota(user.id, fn))) return error(429, 'rate_limited');
  return { userId: user.id };
}

/**
 * Base64 JPEG (re-encoded and scaled to 1024 px on the device, so no EXIF/GPS), at most ~2 MB.
 * Keeps request size and AI cost bounded.
 */
export const MAX_IMAGE_BASE64 = 2_800_000;
export const validImage = (b64: unknown): b64 is string => typeof b64 === 'string' && b64.length > 100 && b64.length < MAX_IMAGE_BASE64 && b64.startsWith('/9j/');
