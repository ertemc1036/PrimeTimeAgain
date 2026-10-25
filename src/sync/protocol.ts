/** Wire format shared with supabase/functions/sync (see supabase/functions/_shared/records.ts). */
export const COLLECTIONS = ['profile', 'plan', 'food', 'foodDone', 'activity', 'rest', 'weight', 'photo', 'savedMeal', 'customFood', 'settings', 'achievement', 'coach'] as const;
export type Collection = (typeof COLLECTIONS)[number];

export interface Change {
  collection: Collection;
  id: string;
  data: Record<string, unknown> | null;
  deleted: boolean;
  /** When the change was made on this device (last-write-wins clock). */
  updatedAt: string;
}
export interface RemoteRecord extends Change {
  seq: number;
}
export type ChangeResult =
  | { collection: Collection; id: string; status: 'applied' | 'stale' }
  | { collection: Collection; id: string; status: 'duplicate'; existingId: string }
  | { collection: Collection; id: string; status: 'invalid'; reason: string };

export interface ServerEntitlement {
  tier: 'free' | 'pro';
  status: 'active' | 'grace_period' | 'billing_issue' | 'expired' | 'none';
  expiresAt: string | null;
  productId: string | null;
}

export interface SyncRequest {
  cursor: number;
  changes: Change[];
}
export interface SyncResponse {
  results: ChangeResult[];
  winners: RemoteRecord[];
  records: RemoteRecord[];
  cursor: number;
  more: boolean;
  entitlement?: ServerEntitlement;
}

export const MAX_BATCH = 500;
export const keyOf = (collection: string, id: string) => `${collection}/${id}`;
