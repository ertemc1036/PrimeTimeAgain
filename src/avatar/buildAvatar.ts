import './polyfills';

import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';

import type { AvatarBody } from '@/domain/types';

import { readClothParams, type ClothParams } from './cloth';
import type { DiagLog } from './diagnostics';
import { createHoloMaterial, type HoloUniforms } from './hologram';
import { loadArrayBuffer } from './loadAssets';
import { BODY_MODELS, type BodyShape } from './models';

/** Reference height for camera framing and scan rings (bodies keep their own heights). */
export const AVATAR_HEIGHT = 1.78;

/** Seconds for the start ↔ goal transition. */
const MORPH_SECONDS = 0.9;

export interface LoadedAvatar {
  root: THREE.Group;
  /** Advance animation by dt seconds (t = running time). */
  update(dt: number, t: number, reducedMotion: boolean): void;
  /** Show the start (heavier) or goal (fit) body; animated unless `instant`. */
  setShape(shape: BodyShape, instant?: boolean): void;
  dispose(): void;
}

export const parseGlb = (buffer: ArrayBuffer) => new Promise<GLTF>((resolve, reject) => new GLTFLoader().parse(buffer, '', resolve, reject));

export interface BodyData {
  /** Goal (fit) body positions. */
  goal: Float32Array;
  /** Start body minus goal body. */
  delta: Float32Array;
  index: THREE.BufferAttribute;
  clothMask: THREE.BufferAttribute;
  hair: THREE.BufferAttribute;
  cloth: ClothParams;
}

/**
 * Read a body GLB (see scripts/avatars/build_makehuman.py). The morph target is read here and
 * removed from the geometry: the app blends on the CPU, so three.js never needs morph textures
 * (texture arrays), which keeps the renderer on the simplest WebGL2 path in expo-gl.
 */
export function readBody(gltf: GLTF): BodyData {
  let mesh: THREE.Mesh | null = null;
  gltf.scene.traverse((o) => {
    if (!mesh && (o as THREE.Mesh).isMesh) mesh = o as THREE.Mesh;
  });
  if (!mesh) throw new Error('Body model contains no mesh');
  const m = mesh as THREE.Mesh;
  const g = m.geometry;
  const pos = g.getAttribute('position');
  const morph = g.morphAttributes.position?.[0];
  const clothMask = g.getAttribute('_clothmask') as THREE.BufferAttribute | undefined;
  const hair = g.getAttribute('_hair') as THREE.BufferAttribute | undefined;
  if (!pos || !morph || !g.index || !clothMask || !hair) throw new Error('Body model is missing data (position, start shape, masks or hair)');
  const goal = new Float32Array(pos.count * 3);
  const delta = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    goal[i * 3] = pos.getX(i);
    goal[i * 3 + 1] = pos.getY(i);
    goal[i * 3 + 2] = pos.getZ(i);
    delta[i * 3] = morph.getX(i);
    delta[i * 3 + 1] = morph.getY(i);
    delta[i * 3 + 2] = morph.getZ(i);
  }
  const cloth = readClothParams(m.userData);
  return { goal, delta, index: g.index, clothMask, hair, cloth };
}

/** Vertex normals for one body state (computed once per state). */
function normalsFor(positions: Float32Array, index: THREE.BufferAttribute) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  g.setIndex(index);
  g.computeVertexNormals();
  const n = (g.getAttribute('normal') as THREE.BufferAttribute).array as Float32Array;
  g.dispose();
  return n;
}

const ease = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

/** Build the chosen body with the hologram material, showing `shape` first. */
export async function buildAvatar(body: AvatarBody, uniforms: HoloUniforms, log?: DiagLog, shape: BodyShape = 'start'): Promise<LoadedAvatar> {
  const file = `body-${body}.glb`;
  const buffer = await (log ? log.stepAsync(`Model ${file} download/read`, () => loadArrayBuffer(BODY_MODELS[body])) : loadArrayBuffer(BODY_MODELS[body]));
  log?.info(`Model ${file} size`, `${Math.round(buffer.byteLength / 1024)} KB`);
  const gltf = await (log ? log.stepAsync(`Model ${file} parse (GLTFLoader)`, () => parseGlb(buffer)) : parseGlb(buffer));
  const data = readBody(gltf);
  gltf.scene.traverse((o) => (o as THREE.Mesh).isMesh && (o as THREE.Mesh).geometry.dispose());

  const count = data.goal.length / 3;
  const start = new Float32Array(data.goal.length);
  for (let i = 0; i < start.length; i++) start[i] = data.goal[i] + data.delta[i];
  const nGoal = normalsFor(data.goal, data.index);
  const nStart = normalsFor(start, data.index);

  const geometry = new THREE.BufferGeometry();
  const position = new THREE.BufferAttribute(new Float32Array(data.goal.length), 3).setUsage(THREE.DynamicDrawUsage);
  const normal = new THREE.BufferAttribute(new Float32Array(data.goal.length), 3).setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position', position);
  geometry.setAttribute('normal', normal);
  geometry.setAttribute('_clothmask', data.clothMask);
  geometry.setAttribute('_hair', data.hair);
  geometry.setIndex(data.index);

  // s = 0: goal body, s = 1: start body.
  const apply = (s: number) => {
    const p = position.array as Float32Array;
    const n = normal.array as Float32Array;
    for (let i = 0; i < count; i++) {
      const k = i * 3;
      p[k] = data.goal[k] + data.delta[k] * s;
      p[k + 1] = data.goal[k + 1] + data.delta[k + 1] * s;
      p[k + 2] = data.goal[k + 2] + data.delta[k + 2] * s;
      const nx = nGoal[k] + (nStart[k] - nGoal[k]) * s;
      const ny = nGoal[k + 1] + (nStart[k + 1] - nGoal[k + 1]) * s;
      const nz = nGoal[k + 2] + (nStart[k + 2] - nGoal[k + 2]) * s;
      const len = Math.hypot(nx, ny, nz) || 1;
      n[k] = nx / len;
      n[k + 1] = ny / len;
      n[k + 2] = nz / len;
    }
    position.needsUpdate = true;
    normal.needsUpdate = true;
  };

  let current = shape === 'start' ? 1 : 0;
  let from = current;
  let target = current;
  let progress = 1;
  apply(current);

  const material = createHoloMaterial(uniforms, data.cloth);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  const root = new THREE.Group();
  root.add(mesh);
  log?.ok('Body built', `${body}, ${count} vertices, ${data.index.count / 3} triangles, shape ${shape}`);

  return {
    root,
    setShape(next, instant = false) {
      const t = next === 'start' ? 1 : 0;
      if (t === target && (instant ? current === t : true)) return;
      if (instant) {
        current = from = target = t;
        progress = 1;
        apply(t);
        return;
      }
      from = current;
      target = t;
      progress = 0;
    },
    update(dt, t, reducedMotion) {
      if (progress < 1) {
        progress = Math.min(1, progress + dt / (reducedMotion ? MORPH_SECONDS * 0.5 : MORPH_SECONDS));
        current = from + (target - from) * ease(progress);
        apply(current);
      }
      if (reducedMotion) {
        root.scale.setScalar(1);
        root.rotation.z = 0;
        return;
      }
      // Calm breathing and a slight weight shift.
      const b = Math.sin(t * 1.5);
      root.scale.set(1 + b * 0.0025, 1 + b * 0.0015, 1 + b * 0.005);
      root.rotation.z = Math.sin(t * 0.45) * 0.006;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
