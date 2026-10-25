import type { Tx } from './db.ts';

/**
 * Sync records: validation and last-write-wins application (server side of the protocol in
 * src/sync/protocol.ts). Conflicts resolve deterministically by (updatedAt, content hash), so
 * every device converges on the same winner.
 */
export const COLLECTIONS = ['profile', 'plan', 'food', 'foodDone', 'activity', 'rest', 'weight', 'photo', 'savedMeal', 'customFood', 'settings', 'achievement', 'coach'] as const;
export type Collection = (typeof COLLECTIONS)[number];

export interface Change {
  collection: Collection;
  id: string;
  data: Record<string, unknown> | null;
  deleted: boolean;
  updatedAt: string;
}
export interface RemoteRecord extends Change {
  seq: number;
}
export type ChangeResult =
  | { collection: string; id: string; status: 'applied' | 'stale' }
  | { collection: string; id: string; status: 'duplicate'; existingId: string }
  | { collection: string; id: string; status: 'invalid'; reason: string };

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const ID = /^[A-Za-z0-9_:.-]{1,100}$/;
const WORKOUTS = ['gym', 'outdoor_walk', 'outdoor_run', 'home'];
const MEALS = ['breakfast', 'lunch', 'dinner', 'snack'];
const SETTINGS = ['notifications', 'eatingWindow', 'journey', 'coachConsent'];
const str = (v: unknown, max: number, min = 0) => typeof v === 'string' && v.length >= min && v.length <= max;

/** Returns a reason when the change must be rejected, else null. */
export function validateChange(c: Partial<Change>, now = Date.now()): string | null {
  if (!c || typeof c !== 'object') return 'shape';
  if (!COLLECTIONS.includes(c.collection as Collection)) return 'collection';
  if (typeof c.id !== 'string' || !ID.test(c.id)) return 'id';
  const t = Date.parse(c.updatedAt ?? '');
  if (!Number.isFinite(t) || t > now + 24 * 3600 * 1000 || t < Date.UTC(2020, 0, 1)) return 'updatedAt';
  if (c.deleted) return null;
  const d = c.data;
  if (!d || typeof d !== 'object' || Array.isArray(d)) return 'data';
  if (JSON.stringify(d).length > 60000) return 'size';
  switch (c.collection) {
    case 'profile':
      return c.id === 'me' && d.adultConfirmed === true && str(d.name, 40, 1) ? null : 'profile';
    case 'plan':
    case 'foodDone':
    case 'rest':
      return DATE.test(c.id) ? null : 'date';
    case 'activity':
      return WORKOUTS.includes(d.type as string) &&
        DATE.test(String(d.date)) &&
        TIME.test(String(d.startTime)) &&
        Number.isInteger(d.durationMin) &&
        (d.durationMin as number) >= 1 &&
        (d.durationMin as number) <= 600 &&
        str(d.description, 200, 2)
        ? null
        : 'activity';
    case 'food':
      return DATE.test(String(d.date)) && MEALS.includes(d.mealType as string) && str(d.title, 80, 1) && Array.isArray(d.items) && d.items.length <= 50 ? null : 'food';
    case 'weight':
      return DATE.test(String(d.date)) && typeof d.kg === 'number' && d.kg >= 30 && d.kg <= 350 ? null : 'weight';
    case 'settings':
      return SETTINGS.includes(c.id) ? null : 'settings';
    case 'coach':
      return (d.role === 'user' || d.role === 'assistant') && str(d.content, 4000, 1) ? null : 'coach';
    default:
      return null;
  }
}

/** Stable JSON (sorted keys) so the same content always hashes the same on every device. */
export function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  if (v && typeof v === 'object') {
    return `{${Object.keys(v as object)
      .sort()
      .filter((k) => (v as Record<string, unknown>)[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${canonical((v as Record<string, unknown>)[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(v ?? null);
}

export async function versionOf(c: Change): Promise<string> {
  if (c.deleted) return '0deleted';
  const bytes = new TextEncoder().encode(canonical(c.data));
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return `1${[...hash.slice(0, 12)].map((b) => b.toString(16).padStart(2, '0')).join('')}`;
}

type Row = { collection: Collection; id: string; data: Record<string, unknown> | null; deleted: boolean; updated_at: Date; server_seq: string | number };
export const toRemote = (r: Row): RemoteRecord => ({
  collection: r.collection,
  id: r.id,
  data: r.deleted ? null : r.data,
  deleted: r.deleted,
  updatedAt: new Date(r.updated_at).toISOString(),
  seq: Number(r.server_seq),
});

/** Apply one change inside the caller's RLS transaction. */
export async function applyChange(tx: Tx, userId: string, c: Change): Promise<{ result: ChangeResult; winner?: RemoteRecord }> {
  const reason = validateChange(c);
  if (reason) return { result: { collection: String(c.collection), id: String(c.id), status: 'invalid', reason } };
  const version = await versionOf(c);
  const data = c.deleted ? null : c.data;
  try {
    const rows = await tx.savepoint(async (sp) =>
      sp<Row[]>`
        insert into public.user_records (user_id, collection, id, data, deleted, updated_at, version)
        values (${userId}, ${c.collection}, ${c.id}, ${data === null ? null : sp.json(data as never)}, ${c.deleted}, ${c.updatedAt}, ${version})
        on conflict (user_id, collection, id) do update
          set data = excluded.data, deleted = excluded.deleted, updated_at = excluded.updated_at, version = excluded.version
          where (excluded.updated_at, excluded.version) > (user_records.updated_at, user_records.version)
        returning collection, id, data, deleted, updated_at, server_seq`,
    );
    if (rows.length) return { result: { collection: c.collection, id: c.id, status: 'applied' } };
    const [current] = await tx<Row[]>`select collection, id, data, deleted, updated_at, server_seq from public.user_records where user_id = ${userId} and collection = ${c.collection} and id = ${c.id}`;
    return { result: { collection: c.collection, id: c.id, status: 'stale' }, winner: current ? toRemote(current) : undefined };
  } catch (e) {
    if ((e as { code?: string }).code === '23505' && c.collection === 'activity' && c.data) {
      const d = c.data;
      const [existing] = await tx<Row[]>`
        select collection, id, data, deleted, updated_at, server_seq from public.user_records
        where user_id = ${userId} and collection = 'activity' and not deleted and id <> ${c.id}
          and data ->> 'type' = ${String(d.type)} and data ->> 'date' = ${String(d.date)}
          and data ->> 'startTime' = ${String(d.startTime)} and data ->> 'durationMin' = ${String(d.durationMin)}`;
      if (existing) return { result: { collection: c.collection, id: c.id, status: 'duplicate', existingId: existing.id }, winner: toRemote(existing) };
    }
    throw e;
  }
}

export async function pull(tx: Tx, userId: string, cursor: number, limit = 1000): Promise<{ records: RemoteRecord[]; more: boolean }> {
  const rows = await tx<Row[]>`
    select collection, id, data, deleted, updated_at, server_seq from public.user_records
    where user_id = ${userId} and server_seq > ${cursor} order by server_seq limit ${limit + 1}`;
  return { records: rows.slice(0, limit).map(toRemote), more: rows.length > limit };
}
