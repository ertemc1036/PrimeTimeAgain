import './polyfills';

import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';

import type { AvatarBody } from '@/domain/types';

import type { DiagLog } from './diagnostics';
import { createHoloMaterial, type HoloUniforms } from './hologram';
import { loadArrayBuffer, loadTexture } from './loadAssets';
import { createMannequinGeometry } from './mannequin';
import { RIGGED_BODIES } from './models';

export const AVATAR_HEIGHT = 1.78;

export interface LoadedAvatar {
  root: THREE.Group;
  /** Advance animation by dt seconds (t = running time). */
  update(dt: number, t: number, reducedMotion: boolean): void;
  dispose(): void;
}

export const parseGlb = (buffer: ArrayBuffer) => new Promise<GLTF>((resolve, reject) => new GLTFLoader().parse(buffer, '', resolve, reject));

const clipCache = new Map<number, Promise<THREE.AnimationClip | null>>();
function loadIdle(module: number) {
  if (!clipCache.has(module)) {
    clipCache.set(
      module,
      loadArrayBuffer(module)
        .then(parseGlb)
        .then((g) => {
          const clip = g.animations[0];
          if (!clip) return null;
          // Rotations only: positions/scales from the source rig would fight the normalised scale.
          clip.tracks = clip.tracks.filter((t) => t.name.endsWith('.quaternion') && !t.name.includes('Footsteps'));
          return clip;
        })
        .catch(() => null),
    );
  }
  return clipCache.get(module)!;
}

/** Normal maps add surface detail; if one can't be loaded the body still renders without it. */
const optionalTexture = (module: number, color: boolean, label: string, log?: DiagLog) =>
  loadTexture(module, color)
    .then((t) => (log?.ok(`Texture ${label}`), t))
    .catch((e: unknown) => {
      log?.fail(`Texture ${label} (optional, body renders without it)`, e);
      return null;
    });

/** Feet on the floor, centred, fixed height (source rigs use different units). */
function normalise(object: THREE.Object3D) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const scale = AVATAR_HEIGHT / size.y;
  object.scale.setScalar(scale);
  const center = box.getCenter(new THREE.Vector3());
  object.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
}

function disposeTree(root: THREE.Object3D) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry.dispose();
    (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach((m) => m.dispose());
  });
}

async function buildRigged(body: 'male' | 'female', uniforms: HoloUniforms, log?: DiagLog): Promise<LoadedAvatar> {
  const spec = RIGGED_BODIES[body];
  const readModel = async () => {
    const buffer = await (log ? log.stepAsync(`Model ${spec.id}.glb download/read`, () => loadArrayBuffer(spec.model)) : loadArrayBuffer(spec.model));
    log?.info(`Model ${spec.id}.glb size`, `${Math.round(buffer.byteLength / 1024)} KB`);
    return log ? log.stepAsync(`Model ${spec.id}.glb parse (GLTFLoader)`, () => parseGlb(buffer)) : parseGlb(buffer);
  };
  const [gltf, bodyN, headN, hair, idle] = await Promise.all([
    readModel(),
    optionalTexture(spec.normals.body, false, 'body normal map', log),
    optionalTexture(spec.normals.head, false, 'head normal map', log),
    spec.hair === null ? Promise.resolve(null) : optionalTexture(spec.hair, true, 'hair', log),
    loadIdle(spec.idle),
  ]);
  if (idle) log?.ok('Idle animation', `${idle.tracks.length} tracks`);
  else log?.fail('Idle animation (optional)', 'not loaded; body stands still');

  const model = gltf.scene;
  model.traverse((obj) => {
    const mesh = obj as THREE.SkinnedMesh;
    if (!mesh.isMesh) return;
    mesh.frustumCulled = false; // skinned bounds are unreliable once animated
    const source = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.Material;
    const name = source.name;
    source.dispose();
    mesh.material =
      name === 'opacity'
        ? createHoloMaterial(uniforms, { alphaMap: hair })
        : createHoloMaterial(uniforms, { normalMap: name === 'head' ? headN : bodyN });
  });
  normalise(model);
  log?.ok('Body built', `${body} (${spec.id})`);

  const root = new THREE.Group();
  root.add(model);
  const mixer = new THREE.AnimationMixer(model);
  if (idle) mixer.clipAction(idle).setLoop(THREE.LoopPingPong, Infinity).play();

  return {
    root,
    update(dt, _t, reducedMotion) {
      mixer.update(reducedMotion ? dt * 0.4 : dt);
    },
    dispose() {
      mixer.stopAllAction();
      disposeTree(root);
      [bodyN, headN, hair].forEach((t) => t?.dispose());
    },
  };
}

function buildNeutral(uniforms: HoloUniforms): LoadedAvatar {
  const mesh = new THREE.Mesh(createMannequinGeometry(), createHoloMaterial(uniforms));
  const root = new THREE.Group();
  root.add(mesh);
  return {
    root,
    update(_dt, t, reducedMotion) {
      if (reducedMotion) return;
      // Calm breathing and weight shift.
      mesh.scale.set(1 + Math.sin(t * 1.6) * 0.004, 1 + Math.sin(t * 1.6) * 0.003, 1 + Math.sin(t * 1.6) * 0.008);
      mesh.rotation.z = Math.sin(t * 0.5) * 0.008;
    },
    dispose() {
      disposeTree(root);
    },
  };
}

/** Build the chosen body with the hologram material. */
export async function buildAvatar(body: AvatarBody, uniforms: HoloUniforms, log?: DiagLog): Promise<LoadedAvatar> {
  if (body === 'neutral') return log ? log.step('Neutral body', () => buildNeutral(uniforms)) : buildNeutral(uniforms);
  return buildRigged(body, uniforms, log);
}
