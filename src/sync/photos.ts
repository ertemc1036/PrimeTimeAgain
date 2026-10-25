import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import type { Mutation } from '@/domain/mutations';
import type { AppData } from '@/domain/types';
import { getSupabase } from '@/services/supabase/client';

/**
 * Private photo storage. Photos are uploaded to private buckets under "<user id>/<id>.jpg"
 * (row-level security on storage), and shown on other devices through short-lived signed URLs.
 */
export const PROGRESS_BUCKET = 'progress-photos';
export const WORKOUT_BUCKET = 'workout-photos';

async function readBytes(uri: string): Promise<ArrayBuffer> {
  if (Platform.OS === 'web' || uri.startsWith('http') || uri.startsWith('blob:') || uri.startsWith('data:')) return (await fetch(uri)).arrayBuffer();
  const { File } = await import('expo-file-system');
  return new File(uri).arrayBuffer();
}

let uploading = false;
export async function uploadPendingPhotos(userId: string, app: { getData(): AppData; dispatch(m: Mutation): Promise<unknown> }) {
  if (uploading) return;
  uploading = true;
  try {
    const sb = await getSupabase();
    if (!sb) return;
    const d = app.getData();
    const jobs = [
      ...d.photos.filter((p) => p.uri && !p.storagePath).map((p) => ({ bucket: PROGRESS_BUCKET, id: p.id, uri: p.uri, done: (path: string) => ({ type: 'setPhotoStoragePath', id: p.id, path }) as Mutation })),
      ...d.activityLogs.filter((a) => a.photoUri && !a.photoPath).map((a) => ({ bucket: WORKOUT_BUCKET, id: a.id, uri: a.photoUri!, done: (path: string) => ({ type: 'setActivityPhotoPath', id: a.id, path }) as Mutation })),
    ];
    for (const job of jobs) {
      try {
        const path = `${userId}/${job.id}.jpg`;
        const { error } = await sb.storage.from(job.bucket).upload(path, await readBytes(job.uri), { contentType: 'image/jpeg', upsert: true });
        if (!error) await app.dispatch(job.done(path));
      } catch {
        // Keep it local; retried after the next sync.
      }
    }
  } finally {
    uploading = false;
  }
}

export async function removeRemotePhoto(bucket: string, path: string | undefined) {
  if (!path) return;
  const sb = await getSupabase();
  await sb?.storage.from(bucket).remove([path]);
}

/** Local file if present, otherwise a signed URL for the private cloud copy (valid for one hour). */
export function usePhotoUri(localUri: string | undefined, bucket: string, path: string | undefined): string | null {
  const [signed, setSigned] = useState<string | null>(null);
  useEffect(() => {
    if (localUri || !path) return;
    let alive = true;
    void getSupabase().then(async (sb) => {
      const r = await sb?.storage.from(bucket).createSignedUrl(path, 3600);
      if (alive && r?.data?.signedUrl) setSigned(r.data.signedUrl);
    });
    return () => {
      alive = false;
    };
  }, [localUri, bucket, path]);
  return localUri || signed;
}
