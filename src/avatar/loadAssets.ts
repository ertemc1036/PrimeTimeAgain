import { Asset } from 'expo-asset';
import { Platform } from 'react-native';

/** Read a bundled binary asset (e.g. a .glb) as an ArrayBuffer on web and native. */
export async function loadArrayBuffer(module: number): Promise<ArrayBuffer> {
  const asset = Asset.fromModule(module);
  if (Platform.OS === 'web') {
    const res = await fetch(asset.uri);
    if (!res.ok) throw new Error(`Failed to load ${asset.uri}`);
    return res.arrayBuffer();
  }
  await asset.downloadAsync();
  const { File } = await import('expo-file-system');
  return new File(asset.localUri ?? asset.uri).arrayBuffer();
}
