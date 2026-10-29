import fs from 'fs';
import path from 'path';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';

import { readBody, type BodyData } from './buildAvatar';
import { clothField } from './cloth';

jest.mock('./loadAssets', () => ({ loadArrayBuffer: jest.fn() }));
jest.mock('./models', () => ({ BODY_MODELS: {} }));

const dir = path.join(__dirname, '../../assets/avatars');
const parse = (file: string) => {
  const buf = fs.readFileSync(path.join(dir, file));
  return new Promise<GLTF>((resolve, reject) => new GLTFLoader().parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer, '', resolve, reject));
};

type Body = 'male' | 'female' | 'neutral';
const bodies: Record<string, BodyData> = {};
beforeAll(async () => {
  for (const b of ['male', 'female', 'neutral'] as Body[]) bodies[b] = readBody(await parse(`body-${b}.glb`));
});

/** Positions of one state: s = 0 goal, 1 start. */
function positions(d: BodyData, s: number) {
  const out = new Float32Array(d.goal.length);
  for (let i = 0; i < out.length; i++) out[i] = d.goal[i] + d.delta[i] * s;
  return out;
}
const mask = (d: BodyData, i: number): [number, number, number] => [d.clothMask.getX(i) * 0.05, d.clothMask.getY(i) * 0.05, d.clothMask.getZ(i) * 0.05];

/** Width (x) and depth (z) of the body slice at height y, arms excluded via the bottom mask. */
function slice(d: BodyData, p: Float32Array, y: number) {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < p.length / 3; i++) {
    if (Math.abs(p[i * 3 + 1] - y) > 0.01 || mask(d, i)[0] < 0.005) continue;
    minX = Math.min(minX, p[i * 3]);
    maxX = Math.max(maxX, p[i * 3]);
    minZ = Math.min(minZ, p[i * 3 + 2]);
    maxZ = Math.max(maxZ, p[i * 3 + 2]);
  }
  return { width: maxX - minX, depth: maxZ - minZ };
}

describe.each(['male', 'female', 'neutral'] as Body[])('%s body asset', (name) => {
  it('has a goal body, a start shape, sportswear masks and stays within the mobile budget', () => {
    const d = bodies[name];
    expect(d.goal.length / 3).toBeGreaterThan(10000);
    expect(d.index.count / 3).toBeLessThan(30000);
    expect(d.delta.some((v) => Math.abs(v) > 0.01)).toBe(true);
    expect(d.cloth.top).toBe(name !== 'male'); // men: sports shorts only
    const p = positions(d, 0);
    let minY = Infinity, maxY = -Infinity;
    for (let i = 1; i < p.length; i += 3) {
      minY = Math.min(minY, p[i]);
      maxY = Math.max(maxY, p[i]);
    }
    expect(minY).toBeCloseTo(0, 2); // feet on the floor
    expect(maxY).toBeGreaterThan(1.55);
    expect(maxY).toBeLessThan(1.95);
  });

  it.each([
    ['goal', 0],
    ['start', 1],
  ])('covers the pelvis with the shorts in the %s shape', (_s, s) => {
    const d = bodies[name];
    const p = positions(d, s as number);
    const c = d.cloth;
    let checked = 0;
    for (let i = 0; i < p.length / 3; i++) {
      const [x, y, z] = [p[i * 3], p[i * 3 + 1], p[i * 3 + 2]];
      if (Math.abs(x) > 0.07 || y < c.hem + 0.04 || y > c.waist - 0.05 || mask(d, i)[0] < 0.01) continue;
      checked++;
      expect(clothField(x, y, z, mask(d, i), c)).toBeGreaterThan(0.001);
    }
    expect(checked).toBeGreaterThan(50);
  });

  if (name !== 'male') {
    it.each([
      ['goal', 0],
      ['start', 1],
    ])('covers the whole chest with the sports top in the %s shape', (_s, s) => {
      const d = bodies[name];
      const p = positions(d, s as number);
      const c = d.cloth;
      let checked = 0;
      for (let i = 0; i < p.length / 3; i++) {
        const [x, y, z] = [p[i * 3], p[i * 3 + 1], p[i * 3 + 2]];
        if (Math.abs(x) > 0.12 || y < c.under + 0.015 || y > c.bustY + 0.03 || z < 0 || mask(d, i)[1] < 0.01) continue;
        checked++;
        expect(clothField(x, y, z, mask(d, i), c)).toBeGreaterThan(0.001);
      }
      expect(checked).toBeGreaterThan(100);
    });
  }

  it('start shape is visibly fuller than the goal shape (waist and belly)', () => {
    const d = bodies[name];
    const waistY = (d.cloth.waist + (d.cloth.top ? d.cloth.under : d.cloth.waist + 0.15)) / 2;
    const goal = slice(d, positions(d, 0), waistY);
    const start = slice(d, positions(d, 1), waistY);
    expect(start.depth).toBeGreaterThan(goal.depth * 1.15);
    expect(start.width).toBeGreaterThan(goal.width * 1.05);
  });
});

describe('silhouettes', () => {
  const ratio = (b: Body, yTopFactor: number, yLowFactor: number) => {
    const d = bodies[b];
    const p = positions(d, 0);
    const top = slice(d, p, d.cloth.waist + yTopFactor);
    const low = slice(d, p, d.cloth.waist + yLowFactor);
    return top.width / low.width;
  };
  it('the male goal body is broader at the chest than at the waist than the female one (V-shape)', () => {
    expect(ratio('male', 0.33, 0.08)).toBeGreaterThan(ratio('female', 0.33, 0.08) + 0.05);
  });
  it('the female goal body has fuller hips relative to the waist than the male one', () => {
    expect(ratio('female', -0.12, 0.08)).toBeGreaterThan(ratio('male', -0.12, 0.08) + 0.05);
  });
});
