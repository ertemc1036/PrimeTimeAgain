import fs from 'fs';
import path from 'path';
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';

const dir = path.join(__dirname, '../../assets/avatars');
const parse = (file: string) => {
  const buf = fs.readFileSync(path.join(dir, file));
  return new Promise<GLTF>((resolve, reject) => new GLTFLoader().parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer, '', resolve, reject));
};

describe.each([
  ['male', 'm09/model.glb', 'animations/idle_m.glb'],
  ['female', 'f13/model.glb', 'animations/idle_f.glb'],
])('%s body asset', (_label, model, idle) => {
  it('is a rigged mesh with the materials the hologram look replaces, within the triangle budget', async () => {
    const g = await parse(model);
    const names = new Set<string>();
    let tris = 0;
    let skinned = 0;
    g.scene.traverse((o) => {
      const m = o as THREE.SkinnedMesh;
      if (!m.isMesh) return;
      if (m.isSkinnedMesh) skinned++;
      tris += (m.geometry.index?.count ?? m.geometry.getAttribute('position').count) / 3;
      names.add((Array.isArray(m.material) ? m.material[0] : m.material).name);
    });
    expect(skinned).toBeGreaterThan(0);
    expect([...names].sort()).toEqual(['body', 'head', 'opacity']);
    expect(tris).toBeLessThan(15000);
  });

  it('has an idle animation with rotation tracks', async () => {
    const g = await parse(idle);
    expect(g.animations.length).toBeGreaterThan(0);
    expect(g.animations[0].tracks.some((t) => t.name.endsWith('.quaternion'))).toBe(true);
  });
});
