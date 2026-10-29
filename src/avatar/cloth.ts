/**
 * Sportswear layout of an avatar body. The band edges (waistband, leg hem, under-band, neckline,
 * straps) are analytic functions of the model position and are evaluated per pixel in the
 * hologram shader, so they are clean lines regardless of mesh density. Per vertex the mesh only
 * stores smooth masks for where clothing may appear (not on arms / head).
 * Must match scripts/avatars/build_makehuman.py (clothing_layout / cloth_eval).
 */
export interface ClothParams {
  hem: number;
  waist: number;
  waistDrop: number;
  top: boolean;
  under: number;
  upper: number;
  scoop: number;
  bustY: number;
  strapX: number;
  strapHalf: number;
  strapRise: number;
}

/** Fields (masks, hair) are stored as value / FIELD_RANGE in normalised bytes. */
export const FIELD_RANGE = 0.05;

export function readClothParams(userData: Record<string, unknown> | undefined): ClothParams {
  const c = userData?.cloth as Partial<ClothParams> | undefined;
  const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
  if (!c) throw new Error('Body model has no sportswear data (mesh extras.cloth)');
  return {
    hem: num(c.hem, 0.7),
    waist: num(c.waist, 1.0),
    waistDrop: num(c.waistDrop, 0.012),
    top: c.top === true,
    under: num(c.under, 0),
    upper: num(c.upper, 0),
    scoop: num(c.scoop, 0.03),
    bustY: num(c.bustY, 0),
    strapX: num(c.strapX, 0.088),
    strapHalf: num(c.strapHalf, 0.017),
    strapRise: num(c.strapRise, 0.2),
  };
}

/**
 * Signed distance (m) to the nearest sportswear edge at a model-space point; > 0 = covered.
 * Same formula as CLOTH_GLSL below (used by tests to check coverage).
 */
export function clothField(x: number, y: number, z: number, mask: [number, number, number], c: ClothParams): number {
  const front = Math.min(1, Math.max(0, z / 0.12));
  const fb = Math.min(y - c.hem, c.waist - c.waistDrop * front - y);
  let field = Math.min(fb, mask[0]);
  if (c.top) {
    const ft = Math.min(y - c.under, c.upper - c.scoop * Math.exp(-((x / 0.07) ** 2)) * front - y);
    const fs = Math.min(c.strapHalf - Math.abs(Math.abs(x) - c.strapX), Math.min(y - c.bustY, c.bustY + c.strapRise - y));
    field = Math.max(field, Math.min(ft, mask[1]), Math.min(fs, mask[2]));
  }
  return field;
}

export const CLOTH_GLSL = /* glsl */ `
uniform vec4 uCloth;   // hem, waist, waistDrop, top (0/1)
uniform vec4 uTop;     // under, upper, scoop, bustY
uniform vec3 uStrap;   // strapX, strapHalf, strapRise
float d9ClothField(vec3 p, vec3 m) {
  float front = clamp(p.z / 0.12, 0.0, 1.0);
  float fb = min(p.y - uCloth.x, uCloth.y - uCloth.z * front - p.y);
  float field = min(fb, m.x);
  if (uCloth.w > 0.5) {
    float ft = min(p.y - uTop.x, uTop.y - uTop.z * exp(-pow(p.x / 0.07, 2.0)) * front - p.y);
    float fs = min(uStrap.y - abs(abs(p.x) - uStrap.x), min(p.y - uTop.w, uTop.w + uStrap.z - p.y));
    field = max(field, max(min(ft, m.y), min(fs, m.z)));
  }
  return field;
}`;
