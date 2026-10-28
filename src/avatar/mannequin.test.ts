import * as THREE from 'three';

import { AVATAR_HEIGHT } from './buildAvatar';
import { createHoloMaterial, createHoloUniforms } from './hologram';
import { createMannequinGeometry } from './mannequin';

jest.mock('./loadAssets', () => ({ loadArrayBuffer: jest.fn(), loadTexture: jest.fn() }));
jest.mock('./models', () => ({ RIGGED_BODIES: {} }));

describe('neutral body', () => {
  const g = createMannequinGeometry();
  g.computeBoundingBox();
  const box = g.boundingBox!;

  it('stands on the floor at the same height as the rigged bodies, centred', () => {
    expect(box.min.y).toBeCloseTo(0, 1);
    expect(box.max.y).toBeGreaterThan(AVATAR_HEIGHT - 0.06);
    expect(box.max.y).toBeLessThan(AVATAR_HEIGHT + 0.03);
    expect(Math.abs(box.min.x + box.max.x)).toBeLessThan(0.01); // symmetric
  });

  it('stays within the mobile triangle budget (like the rigged bodies, < 15k)', () => {
    const tris = g.index!.count / 3;
    expect(tris).toBeLessThan(15000);
    expect(g.getAttribute('normal').count).toBe(g.getAttribute('position').count);
  });

  it('uses the hologram material, which keeps a stable shader cache key', () => {
    const m = createHoloMaterial(createHoloUniforms());
    expect(m).toBeInstanceOf(THREE.MeshStandardMaterial);
    expect(m.customProgramCacheKey()).toBe('diet9-holo-');
    expect(typeof m.onBeforeCompile).toBe('function');
  });
});
