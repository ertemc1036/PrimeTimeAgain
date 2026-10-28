import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Neutral body: a smooth, gender-neutral figure generated in code (no external asset).
 * Proportions are generic and fixed; they are not derived from the user's weight or height.
 * Height is 1.78 m with the feet at y = 0, like the rigged bodies.
 */
export function createMannequinGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const add = (g: THREE.BufferGeometry, pos: [number, number, number], rot: [number, number, number] = [0, 0, 0], scale: [number, number, number] = [1, 1, 1]) => {
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(...pos),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)),
      new THREE.Vector3(...scale),
    );
    g.applyMatrix4(m); // also transforms the normals
    g.deleteAttribute('uv'); // mergeGeometries needs identical attributes on every part
    parts.push(g);
  };
  const capsule = (r: number, len: number) => new THREE.CapsuleGeometry(r, len, 8, 20);

  // Head, neck
  add(new THREE.SphereGeometry(0.1, 28, 20), [0, 1.645, 0.005], [0, 0, 0], [0.86, 1.1, 0.98]);
  add(new THREE.CylinderGeometry(0.048, 0.056, 0.13, 20), [0, 1.5, 0]);

  // Torso: lathe profile (radius, height), flattened front to back.
  const profile = [
    [0.0, 0.9],
    [0.13, 0.905],
    [0.165, 0.96],
    [0.17, 1.02],
    [0.148, 1.12],
    [0.152, 1.22],
    [0.172, 1.33],
    [0.18, 1.4],
    [0.155, 1.45],
    [0.09, 1.48],
    [0.0, 1.49],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  add(new THREE.LatheGeometry(profile, 40), [0, 0, 0], [0, 0, 0], [1, 1, 0.64]);

  for (const side of [-1, 1]) {
    // Shoulder, upper arm, forearm, hand
    add(new THREE.SphereGeometry(0.05, 20, 14), [side * 0.2, 1.4, 0], [0, 0, 0], [1, 0.85, 0.9]);
    add(capsule(0.046, 0.24), [side * 0.215, 1.255, 0], [0, 0, side * 0.1]);
    add(capsule(0.038, 0.22), [side * 0.238, 1.0, 0.02], [0.08, 0, side * 0.05]);
    add(new THREE.SphereGeometry(0.05, 18, 14), [side * 0.245, 0.83, 0.03], [0, 0, 0], [0.62, 1.25, 0.42]);
    // Thigh, knee, shin, foot
    add(capsule(0.074, 0.34), [side * 0.093, 0.68, 0]);
    add(capsule(0.052, 0.34), [side * 0.093, 0.27, -0.005]);
    add(capsule(0.04, 0.12), [side * 0.093, 0.045, 0.045], [Math.PI / 2, 0, 0], [1.05, 1, 0.75]);
  }

  const geometry = mergeGeometries(parts, false);
  parts.forEach((p) => p.dispose());
  if (!geometry) throw new Error('mannequin geometry');
  return geometry;
}
