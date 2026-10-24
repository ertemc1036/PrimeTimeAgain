import { Platform } from 'react-native';

/**
 * Progress photos are optional and private: copied into the app's own documents folder and never
 * uploaded. On web (development only) the picked URI is kept for the session.
 */
const FOLDER = 'progress-photos';

export async function importProgressPhoto(sourceUri: string): Promise<string> {
  if (Platform.OS === 'web') return sourceUri;
  const { Directory, File, Paths } = await import('expo-file-system');
  const dir = new Directory(Paths.document, FOLDER);
  dir.create({ idempotent: true, intermediates: true });
  const dest = new File(dir, `${Date.now()}.jpg`);
  await new File(sourceUri).copy(dest);
  return dest.uri;
}

export async function deleteProgressPhoto(uri: string): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const { File } = await import('expo-file-system');
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Already gone; nothing to do.
  }
}

export async function deleteAllProgressPhotos(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const { Directory, Paths } = await import('expo-file-system');
    const dir = new Directory(Paths.document, FOLDER);
    if (dir.exists) dir.delete();
  } catch {
    // Nothing stored yet.
  }
}
