import { File, Directory, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

export type PickResult = { ok: true; uri: string; base64: string } | { ok: false; reason: 'cancelled' | 'permission' | 'failed' };

/**
 * Take or choose a photo, then re-encode it. Re-encoding drops EXIF metadata (including GPS
 * location) and downsizes the image before anything is stored or sent for analysis.
 */
export async function pickPhoto(source: 'camera' | 'library', maxWidth = 1024): Promise<PickResult> {
  try {
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return { ok: false, reason: 'permission' };
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.8, exif: false, allowsEditing: false };
    const res = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (res.canceled || !res.assets?.[0]) return { ok: false, reason: 'cancelled' };
    const asset = res.assets[0];
    const ctx = ImageManipulator.manipulate(asset.uri);
    if (asset.width > maxWidth) ctx.resize({ width: maxWidth });
    const image = await ctx.renderAsync();
    const out = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.75, base64: true });
    return { ok: true, uri: out.uri, base64: out.base64 ?? '' };
  } catch {
    return { ok: false, reason: 'failed' };
  }
}

/** Copy a photo into the app's private document folder (never a public location). */
export async function storePrivately(uri: string, name: string): Promise<string> {
  if (Platform.OS === 'web') return uri;
  const dir = new Directory(Paths.document, 'private-photos');
  if (!dir.exists) dir.create({ idempotent: true });
  const dest = new File(dir, `${name}.jpg`);
  await new File(uri).copy(dest);
  return dest.uri;
}

export function deletePrivate(uri: string) {
  if (Platform.OS === 'web') return;
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    // Already gone.
  }
}
