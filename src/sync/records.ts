import type { AppData } from '@/domain/types';

import { keyOf, type Change, type Collection, type RemoteRecord } from './protocol';

/**
 * Mapping between the app's local data and sync records. Each record keeps a reference to the local
 * object it came from (`src`), so changes are detected by reference after an immutable update.
 * Device-only fields (local photo files) are never uploaded and are preserved when applying remote data.
 */
export interface LocalRecord {
  collection: Collection;
  id: string;
  /** The local object (or primitive) this record represents. */
  src: unknown;
}

const SETTINGS_IDS = ['notifications', 'eatingWindow', 'journey', 'coachConsent'] as const;

export function toRecords(data: AppData): Map<string, LocalRecord> {
  const out = new Map<string, LocalRecord>();
  const add = (collection: Collection, id: string, src: unknown) => out.set(keyOf(collection, id), { collection, id, src });
  if (data.profile) add('profile', 'me', data.profile);
  for (const [date, plan] of Object.entries(data.plans)) add('plan', date, plan);
  for (const f of data.foodLogs) add('food', f.id, f);
  for (const [date, c] of Object.entries(data.foodCompletions)) add('foodDone', date, c);
  for (const a of data.activityLogs) add('activity', a.id, a);
  for (const [date, r] of Object.entries(data.recoveryLogs)) add('rest', date, r);
  for (const w of data.weights) add('weight', w.id, w);
  for (const p of data.photos) add('photo', p.id, p);
  for (const m of data.savedMeals) add('savedMeal', m.id, m);
  for (const c of data.customFoods) add('customFood', c.id, c);
  for (const a of data.achievements) add('achievement', a.id, a);
  for (const m of data.coach.messages) add('coach', m.id, m);
  add('settings', 'notifications', data.notifications);
  add('settings', 'eatingWindow', data.eatingWindow);
  add('settings', 'journey', data.journey);
  add('settings', 'coachConsent', data.coach.consentToContext);
  return out;
}

/** The JSON that is uploaded for a record (device-only fields removed). */
export function payloadOf(r: LocalRecord): Record<string, unknown> {
  if (r.collection === 'settings' && r.id === 'coachConsent') return { value: !!r.src };
  const obj = { ...(r.src as Record<string, unknown>) };
  if (r.collection === 'photo') delete obj.uri;
  if (r.collection === 'activity') delete obj.photoUri;
  return JSON.parse(JSON.stringify(obj)) as Record<string, unknown>;
}

/** Records that differ between two snapshots (added, changed or removed). */
export function diffRecords(prev: AppData, next: AppData, at: string): Change[] {
  const a = toRecords(prev);
  const b = toRecords(next);
  const changes: Change[] = [];
  for (const [key, r] of b) {
    const old = a.get(key);
    if (!old || old.src !== r.src) changes.push({ collection: r.collection, id: r.id, data: payloadOf(r), deleted: false, updatedAt: at });
  }
  for (const [key, r] of a) {
    if (!b.has(key) && r.collection !== 'profile' && r.collection !== 'settings') changes.push({ collection: r.collection, id: r.id, data: null, deleted: true, updatedAt: at });
  }
  return changes;
}

/** Every local record as a change (used when uploading an existing device to a new account). */
export function allChanges(data: AppData, at: string): Change[] {
  return [...toRecords(data).values()].map((r) => ({ collection: r.collection, id: r.id, data: payloadOf(r), deleted: false, updatedAt: at }));
}

const upsert = <T extends { id: string }>(list: T[], id: string, item: T | null) => {
  const rest = list.filter((x) => x.id !== id);
  return item ? [...rest, item] : rest;
};
const setKey = <T>(rec: Record<string, T>, key: string, value: T | null) => {
  const next = { ...rec };
  if (value === null) delete next[key];
  else next[key] = value;
  return next;
};

/** Apply remote records to local data (immutably). Device-only fields of existing items are kept. */
export function applyRecords(data: AppData, records: RemoteRecord[]): AppData {
  let d = data;
  for (const r of records) {
    const v = r.deleted ? null : (r.data as never);
    switch (r.collection) {
      case 'profile':
        if (v) d = { ...d, profile: v };
        break;
      case 'plan':
        d = { ...d, plans: setKey(d.plans, r.id, v) };
        break;
      case 'food':
        d = { ...d, foodLogs: upsert(d.foodLogs, r.id, v) };
        break;
      case 'foodDone':
        d = { ...d, foodCompletions: setKey(d.foodCompletions, r.id, v) };
        break;
      case 'activity': {
        const local = d.activityLogs.find((x) => x.id === r.id);
        d = { ...d, activityLogs: upsert(d.activityLogs, r.id, v ? ({ ...(v as object), ...(local?.photoUri ? { photoUri: local.photoUri } : {}) } as never) : null) };
        break;
      }
      case 'rest':
        d = { ...d, recoveryLogs: setKey(d.recoveryLogs, r.id, v) };
        break;
      case 'weight':
        d = { ...d, weights: upsert(d.weights, r.id, v).sort((x, y) => (x.date < y.date ? -1 : 1)) };
        break;
      case 'photo': {
        const local = d.photos.find((x) => x.id === r.id);
        d = { ...d, photos: upsert(d.photos, r.id, v ? ({ ...(v as object), uri: local?.uri ?? '' } as never) : null).sort((x, y) => (x.createdAt < y.createdAt ? -1 : 1)) };
        break;
      }
      case 'savedMeal':
        d = { ...d, savedMeals: upsert(d.savedMeals, r.id, v) };
        break;
      case 'customFood':
        d = { ...d, customFoods: upsert(d.customFoods, r.id, v) };
        break;
      case 'achievement':
        d = { ...d, achievements: upsert(d.achievements, r.id, v) };
        break;
      case 'coach':
        d = { ...d, coach: { ...d.coach, messages: upsert(d.coach.messages, r.id, v).sort((x, y) => (x.createdAt < y.createdAt ? -1 : 1)) } };
        break;
      case 'settings':
        if (!v || !(SETTINGS_IDS as readonly string[]).includes(r.id)) break;
        if (r.id === 'coachConsent') d = { ...d, coach: { ...d.coach, consentToContext: !!(v as { value?: boolean }).value } };
        else d = { ...d, [r.id]: { ...(d[r.id as 'notifications'] as object), ...(v as object) } } as AppData;
        break;
    }
  }
  return d;
}

/** True when the device holds anything worth keeping. */
export const hasUserData = (d: AppData) =>
  !!d.profile || d.foodLogs.length > 0 || d.activityLogs.length > 0 || Object.keys(d.plans).length > 0 || Object.keys(d.recoveryLogs).length > 0 || d.weights.length > 0;
