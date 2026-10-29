import * as THREE from 'three';

import { AVATAR_HEIGHT } from './buildAvatar';
import { createHoloUniforms, HOLO, type HoloUniforms } from './hologram';

/** Camera framing: zoom 0 = full body with rings, zoom 1 = upper body. */
export const CAMERA = {
  fov: 30,
  far: { distance: 5.3, target: AVATAR_HEIGHT * 0.5 },
  near: { distance: 2.2, target: AVATAR_HEIGHT * 0.78 },
  pitch: 0.07,
};

/** Soft radial texture generated in JS (works on web and native without image decoding). */
function radialTexture(size: number, alpha: (r: number) => number): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x + 0.5) / size - 0.5;
      const dy = (y + 0.5) / size - 0.5;
      const a = alpha(Math.min(Math.sqrt(dx * dx + dy * dy) * 2, 1));
      const i = (y * size + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = 255;
      data[i + 3] = Math.round(Math.max(0, Math.min(1, a)) * 255);
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.needsUpdate = true;
  return tex;
}

const additive = (color: string, opacity: number, map?: THREE.Texture) =>
  new THREE.MeshBasicMaterial({ color, opacity, map, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });

/** A flat ring made of evenly spaced dashes (one merged geometry). */
function dashedRing(radius: number, width: number, dashes: number, fill: number) {
  const parts: THREE.BufferGeometry[] = [];
  const step = (Math.PI * 2) / dashes;
  for (let i = 0; i < dashes; i++) parts.push(new THREE.RingGeometry(radius, radius + width, 6, 1, i * step, step * fill));
  const merged = new THREE.BufferGeometry();
  const positions: number[] = [];
  const indices: number[] = [];
  let offset = 0;
  for (const p of parts) {
    const pos = p.getAttribute('position');
    for (let i = 0; i < pos.count; i++) positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
    const idx = p.getIndex()!;
    for (let i = 0; i < idx.count; i++) indices.push(idx.getX(i) + offset);
    offset += pos.count;
    p.dispose();
  }
  merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  merged.setIndex(indices);
  return merged;
}

export interface Stage {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  /** Rotated by the user's drag; the body lives here. */
  turntable: THREE.Group;
  uniforms: HoloUniforms;
  update(t: number, dt: number, reducedMotion: boolean): void;
  /** Brief brighter, faster scan (e.g. when the body shape changes). */
  pulse(): void;
  dispose(): void;
}

export function createStage(): Stage {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(HOLO.background);
  const camera = new THREE.PerspectiveCamera(CAMERA.fov, 1, 0.1, 40);
  const uniforms = createHoloUniforms();
  const disposables: { dispose(): void }[] = [];
  const keep = <T extends { dispose(): void }>(x: T) => (disposables.push(x), x);

  const turntable = new THREE.Group();
  scene.add(turntable);

  // Lights: cool key, neon rims from behind, low fill. Gives the dark body readable form.
  scene.add(new THREE.HemisphereLight(0xcfe9dc, 0x050606, 0.55));
  const key = new THREE.DirectionalLight(0xe8f4ee, 2.0);
  key.position.set(1.4, 2.6, 2.6);
  const rimL = new THREE.DirectionalLight(HOLO.neon, 1.6);
  rimL.position.set(-2.4, 2.0, -2.2);
  const rimR = new THREE.DirectionalLight(HOLO.green, 1.2);
  rimR.position.set(2.4, 1.4, -2.0);
  const fill = new THREE.DirectionalLight(0x9fb7aa, 0.35);
  fill.position.set(-1.8, 0.8, 2.4);
  scene.add(key, rimL, rimR, fill);

  // Backdrop glow behind the body (faces the camera; the camera only orbits vertically a little).
  const glowTex = keep(radialTexture(128, (r) => Math.pow(1 - r, 2.4) * 0.55));
  const backdrop = new THREE.Mesh(keep(new THREE.PlaneGeometry(4.2, 4.2)), keep(additive(HOLO.green, 0.28, glowTex)));
  backdrop.position.set(0, AVATAR_HEIGHT * 0.55, -1.6);
  scene.add(backdrop);

  // Floor: soft pool of light, contact shadow, and rotating dashed rings.
  const floor = new THREE.Group();
  scene.add(floor);
  const poolTex = keep(radialTexture(128, (r) => Math.pow(1 - r, 1.6) * 0.9));
  const pool = new THREE.Mesh(keep(new THREE.CircleGeometry(1.25, 48)), keep(additive(HOLO.neon, 0.22, poolTex)));
  const shadowTex = keep(radialTexture(64, (r) => Math.pow(1 - r, 2.2) * 0.9));
  const shadow = new THREE.Mesh(keep(new THREE.CircleGeometry(0.42, 32)), keep(new THREE.MeshBasicMaterial({ color: 0x000000, map: shadowTex, transparent: true, depthWrite: false })));
  const solid = new THREE.Mesh(keep(new THREE.RingGeometry(0.62, 0.635, 96)), keep(additive(HOLO.neon, 0.9)));
  const dashA = new THREE.Mesh(keep(dashedRing(0.78, 0.018, 48, 0.55)), keep(additive(HOLO.neon, 0.55)));
  const dashB = new THREE.Mesh(keep(dashedRing(0.98, 0.01, 96, 0.3)), keep(additive(HOLO.green, 0.4)));
  const outer = new THREE.Mesh(keep(new THREE.RingGeometry(1.16, 1.168, 128)), keep(additive(HOLO.green, 0.22)));
  [pool, shadow, solid, dashA, dashB, outer].forEach((m, i) => {
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.002 + i * 0.0005;
    floor.add(m);
  });

  // Scan rings: elliptical bands that travel up and down the body.
  const bandTex = keep(radialTexture(64, (r) => (r > 0.86 ? Math.pow(1 - (r - 0.86) / 0.14, 1.5) : Math.pow(r / 0.86, 6) * 0.35)));
  const makeScanRing = (color: string, opacity: number) => {
    const g = new THREE.Group();
    const line = new THREE.Mesh(keep(new THREE.RingGeometry(0.47, 0.478, 96)), keep(additive(color, opacity)));
    const halo = new THREE.Mesh(keep(new THREE.CircleGeometry(0.54, 64)), keep(additive(color, opacity * 0.35, bandTex)));
    [line, halo].forEach((m) => (m.rotation.x = -Math.PI / 2));
    g.add(line, halo);
    g.scale.set(1, 1, 0.62);
    scene.add(g);
    return { group: g, line: line.material as THREE.MeshBasicMaterial, halo: halo.material as THREE.MeshBasicMaterial, opacity };
  };
  const scanA = makeScanRing(HOLO.neon, 0.95);
  const scanB = makeScanRing(HOLO.green, 0.6);

  // Rising light particles around the body.
  const COUNT = 90;
  const positions = new Float32Array(COUNT * 3);
  const speeds = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    const a = (i / COUNT) * Math.PI * 2 * 7.3;
    const r = 0.5 + ((i * 37) % 23) / 40;
    positions[i * 3] = Math.cos(a) * r;
    positions[i * 3 + 1] = ((i * 53) % 97) / 97 * 2.1;
    positions[i * 3 + 2] = Math.sin(a) * r * 0.7;
    speeds[i] = 0.05 + ((i * 29) % 11) / 110;
  }
  const particleGeo = keep(new THREE.BufferGeometry());
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const dotTex = keep(radialTexture(32, (r) => Math.pow(1 - r, 2)));
  const particles = new THREE.Points(
    particleGeo,
    keep(new THREE.PointsMaterial({ color: HOLO.neon, size: 0.03, map: dotTex, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending })),
  );
  scene.add(particles);

  const ease = (x: number) => 0.5 - 0.5 * Math.cos(Math.PI * x);
  let boost = 0;

  return {
    scene,
    camera,
    turntable,
    uniforms,
    update(t, dt, reducedMotion) {
      uniforms.uTime.value = t;
      const speed = reducedMotion ? 0.25 : 1;
      dashA.rotation.z += dt * 0.25 * speed;
      dashB.rotation.z -= dt * 0.12 * speed;
      // Ring A sweeps the full height every 5.2 s (up and down); ring B follows half a cycle later.
      const cycle = 5.2 / speed;
      const pa = ease(Math.abs(((t / cycle) % 2) - 1));
      const pb = ease(Math.abs((((t + cycle * 0.5) / cycle) % 2) - 1));
      const ya = 0.08 + pa * (AVATAR_HEIGHT + 0.02);
      const yb = 0.08 + pb * (AVATAR_HEIGHT + 0.02);
      scanA.group.position.y = ya;
      scanB.group.position.y = yb;
      // Rings narrow slightly towards the head, like a body scan.
      scanA.group.scale.x = 1 - pa * 0.28;
      scanA.group.scale.z = 0.62 * (1 - pa * 0.28);
      scanB.group.scale.x = 1 - pb * 0.28;
      scanB.group.scale.z = 0.62 * (1 - pb * 0.28);
      uniforms.uScan.value = ya;
      boost = Math.max(0, boost - dt / 1.2);
      uniforms.uScanStrength.value = (reducedMotion ? 0.4 : 1) * (1 + boost * 0.9);
      const pulse = 0.85 + 0.15 * Math.sin(t * 3);
      scanA.line.opacity = Math.min(1, scanA.opacity * pulse * (1 + boost));
      scanB.line.opacity = Math.min(1, scanB.opacity * (1.15 - pulse * 0.3) * (1 + boost));
      (pool.material as THREE.MeshBasicMaterial).opacity = 0.18 + 0.05 * Math.sin(t * 1.3) + boost * 0.15;
      if (!reducedMotion) {
        const p = particleGeo.getAttribute('position') as THREE.BufferAttribute;
        for (let i = 0; i < COUNT; i++) {
          let y = p.getY(i) + speeds[i] * dt;
          if (y > 2.1) y = 0;
          p.setY(i, y);
        }
        p.needsUpdate = true;
      }
    },
    pulse() {
      boost = 1;
    },
    dispose() {
      disposables.forEach((d) => d.dispose());
    },
  };
}

/** Place the camera for a zoom level (0..1). */
export function frameCamera(camera: THREE.PerspectiveCamera, zoom: number) {
  const distance = THREE.MathUtils.lerp(CAMERA.far.distance, CAMERA.near.distance, zoom);
  const target = THREE.MathUtils.lerp(CAMERA.far.target, CAMERA.near.target, zoom);
  camera.position.set(0, target + Math.sin(CAMERA.pitch) * distance, Math.cos(CAMERA.pitch) * distance);
  camera.lookAt(0, target, 0);
}
