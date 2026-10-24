import * as THREE from 'three';

import { AVATAR_HEIGHT } from './buildAvatar';
import type { AvatarLighting } from './types';

/** Camera framing: zoom 0 = full body, zoom 1 = head and shoulders. */
export const CAMERA = {
  fov: 28,
  far: { distance: 5.6, target: AVATAR_HEIGHT * 0.52 },
  near: { distance: 1.7, target: AVATAR_HEIGHT * 0.86 },
  minPitch: -0.08,
  maxPitch: 0.32,
};

const LIGHTING: Record<
  AvatarLighting,
  { hemi: [number, number, number]; key: [number, number]; rim: [number, number]; fill: number; ring: number }
> = {
  // [sky, ground, intensity], [color, intensity] ...
  studio: { hemi: [0xffffff, 0x202126, 0.9], key: [0xfff6ec, 2.6], rim: [0xdfe8ff, 2.2], fill: 0.6, ring: 0xffffff },
  dusk: { hemi: [0xffe2c4, 0x1a1412, 0.8], key: [0xffc58f, 2.4], rim: [0x9fb7ff, 2.4], fill: 0.45, ring: 0xffc58f },
  cool: { hemi: [0xdbe7ff, 0x0d1220, 0.85], key: [0xe9f1ff, 2.3], rim: [0x7fd4ff, 2.6], fill: 0.5, ring: 0x9fdcff },
};

/** Soft radial texture generated in JS (works on web and native without image decoding). */
function radialTexture(size: number, stops: (r: number) => number): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x + 0.5) / size - 0.5;
      const dy = (y + 0.5) / size - 0.5;
      const a = stops(Math.min(Math.sqrt(dx * dx + dy * dy) * 2, 1));
      const i = (y * size + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = 255;
      data[i + 3] = Math.round(a * 255);
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.needsUpdate = true;
  return tex;
}

export interface Stage {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  turntable: THREE.Group;
  setLighting(lighting: AvatarLighting): void;
  dispose(): void;
}

export function createStage(background: string): Stage {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(background);
  const camera = new THREE.PerspectiveCamera(CAMERA.fov, 1, 0.1, 50);

  // Everything that rotates with the user's drag lives on the turntable.
  const turntable = new THREE.Group();
  scene.add(turntable);

  // Contact shadow + soft glow under the feet.
  const shadowTex = radialTexture(128, (r) => Math.pow(1 - r, 2.2) * 0.85);
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 1.5),
    new THREE.MeshBasicMaterial({ map: shadowTex, color: 0x000000, transparent: true, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.002;
  turntable.add(shadow);

  const glowTex = radialTexture(128, (r) => Math.pow(r, 5) * Math.pow(1 - r, 1.5) * 1.4);
  const glowMat = new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), glowMat);
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.001;
  scene.add(glow);

  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 0.912, 96), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.003;
  scene.add(ring);

  const hemi = new THREE.HemisphereLight();
  const key = new THREE.DirectionalLight();
  key.position.set(1.6, 2.6, 2.4);
  const rimL = new THREE.DirectionalLight();
  rimL.position.set(-2.2, 2.2, -2.4);
  const rimR = new THREE.DirectionalLight();
  rimR.position.set(2.4, 1.6, -2.2);
  const fill = new THREE.DirectionalLight(0xffffff);
  fill.position.set(-2, 1, 2.5);
  scene.add(hemi, key, rimL, rimR, fill);

  const setLighting = (lighting: AvatarLighting) => {
    const l = LIGHTING[lighting];
    hemi.color.setHex(l.hemi[0]);
    hemi.groundColor.setHex(l.hemi[1]);
    hemi.intensity = l.hemi[2];
    key.color.setHex(l.key[0]);
    key.intensity = l.key[1];
    rimL.color.setHex(l.rim[0]);
    rimR.color.setHex(l.rim[0]);
    rimL.intensity = l.rim[1];
    rimR.intensity = l.rim[1] * 0.7;
    fill.intensity = l.fill;
    ringMat.color.setHex(l.ring);
    glowMat.color.setHex(l.ring);
  };
  setLighting('studio');

  return {
    scene,
    camera,
    turntable,
    setLighting,
    dispose() {
      [shadowTex, glowTex].forEach((t) => t.dispose());
      [shadow, glow, ring].forEach((m) => {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      });
    },
  };
}

/** Place the camera for a zoom level (0..1) and pitch (radians). */
export function frameCamera(camera: THREE.PerspectiveCamera, zoom: number, pitch: number) {
  const distance = THREE.MathUtils.lerp(CAMERA.far.distance, CAMERA.near.distance, zoom);
  const target = THREE.MathUtils.lerp(CAMERA.far.target, CAMERA.near.target, zoom);
  camera.position.set(0, target + Math.sin(pitch) * distance, Math.cos(pitch) * distance);
  camera.lookAt(0, target, 0);
}
