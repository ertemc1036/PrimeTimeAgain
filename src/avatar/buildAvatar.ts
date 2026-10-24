import './polyfills';

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import { loadArrayBuffer, loadTexture } from './loadAssets';
import { ANIMATIONS } from './presets';
import type { AvatarPose, AvatarPreset } from './types';

export const AVATAR_HEIGHT = 1.78;

export interface LoadedAvatar {
  root: THREE.Group;
  mixer: THREE.AnimationMixer;
  play(pose: AvatarPose): void;
  dispose(): void;
}

const parseGlb = (buffer: ArrayBuffer) =>
  new Promise<import('three/addons/loaders/GLTFLoader.js').GLTF>((resolve, reject) =>
    new GLTFLoader().parse(buffer, '', resolve, reject),
  );

const clipCache = new Map<number, Promise<THREE.AnimationClip>>();

function loadClip(module: number) {
  if (!clipCache.has(module)) {
    clipCache.set(
      module,
      loadArrayBuffer(module)
        .then(parseGlb)
        .then((g) => {
          const clip = g.animations[0];
          // Keep only rotations: positions/scales from the source rig would fight our normalised scale.
          clip.tracks = clip.tracks.filter((t) => t.name.endsWith('.quaternion') && !t.name.includes('Footsteps'));
          return clip;
        }),
    );
  }
  return clipCache.get(module)!;
}

/** Load a preset's model, textures and idle animations, normalised to a standing height at the origin. */
export async function buildAvatar(preset: AvatarPreset): Promise<LoadedAvatar> {
  const [gltf, body, bodyN, head, headN, hair, ...clips] = await Promise.all([
    loadArrayBuffer(preset.model).then(parseGlb),
    loadTexture(preset.textures.body, true),
    loadTexture(preset.textures.bodyNormal, false),
    loadTexture(preset.textures.head, true),
    loadTexture(preset.textures.headNormal, false),
    preset.textures.hair === null ? Promise.resolve(null) : loadTexture(preset.textures.hair, true),
    ...ANIMATIONS[preset.gender].map((a) => loadClip(a.module)),
  ]);

  const model = gltf.scene;
  model.traverse((obj) => {
    const mesh = obj as THREE.SkinnedMesh;
    if (!mesh.isMesh) return;
    mesh.frustumCulled = false; // skinned bounds are unreliable once animated
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of materials as THREE.MeshStandardMaterial[]) {
      if (m.name === 'body') Object.assign(m, { map: body, normalMap: bodyN });
      else if (m.name === 'head') Object.assign(m, { map: head, normalMap: headN });
      else if (m.name === 'opacity' && hair) Object.assign(m, { map: hair, alphaTest: 0.35, side: THREE.DoubleSide });
      m.needsUpdate = true;
    }
  });

  // Normalise: feet on the floor, centred, fixed height (source rigs use different units).
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const scale = AVATAR_HEIGHT / size.y;
  model.scale.setScalar(scale);
  const center = box.getCenter(new THREE.Vector3());
  model.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);

  const root = new THREE.Group();
  root.add(model);

  const mixer = new THREE.AnimationMixer(model);
  const actions = ANIMATIONS[preset.gender].map((a, i) => ({ pose: a.pose, action: mixer.clipAction(clips[i]) }));
  let current: THREE.AnimationAction | null = null;

  return {
    root,
    mixer,
    play(pose) {
      const next = (actions.find((a) => a.pose === pose) ?? actions[0]).action;
      if (next === current) return;
      next.reset().setLoop(THREE.LoopPingPong, Infinity).fadeIn(0.4).play();
      current?.fadeOut(0.4);
      current = next;
    },
    dispose() {
      mixer.stopAllAction();
      root.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry.dispose();
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach((m) => m.dispose());
      });
      [body, bodyN, head, headN, hair].forEach((t) => t?.dispose());
    },
  };
}
