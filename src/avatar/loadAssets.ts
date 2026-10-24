import { Asset } from 'expo-asset';
import { Platform } from 'react-native';
import * as THREE from 'three';

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

/**
 * Load a bundled image as a Three.js texture.
 * Web: standard image decoding. Native: expo-gl uploads `{ localUri }` sources directly,
 * because React Native has no browser image decoder.
 */
export async function loadTexture(module: number, color: boolean): Promise<THREE.Texture> {
  const asset = Asset.fromModule(module);
  let texture: THREE.Texture;
  if (Platform.OS === 'web') {
    texture = await new THREE.TextureLoader().loadAsync(asset.uri);
  } else {
    await asset.downloadAsync();
    texture = new THREE.Texture();
    texture.image = { data: { localUri: asset.localUri }, width: asset.width ?? 1024, height: asset.height ?? 1024 };
    // Pass the source straight to gl.texImage2D (expo-gl reads the file natively).
    (texture as THREE.Texture & { isDataTexture: boolean }).isDataTexture = true;
    texture.minFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
  }
  texture.flipY = false; // glTF texture convention
  texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}
