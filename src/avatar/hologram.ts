import * as THREE from 'three';

/** Colours of the Today avatar stage (dark section only; the rest of the app keeps its theme). */
export const HOLO = {
  background: '#0A0C0D',
  neon: '#C8FF2E',
  green: '#4DFF9A',
  body: '#1B201F',
} as const;

/** Uniforms shared by every hologram material, updated once per frame by the stage. */
export interface HoloUniforms {
  uTime: { value: number };
  /** World height (m) of the moving scan band. */
  uScan: { value: number };
  /** 0..1 strength of the scan band and lines (lower with reduced motion). */
  uScanStrength: { value: number };
  uNeon: { value: THREE.Color };
}

export const createHoloUniforms = (): HoloUniforms => ({
  uTime: { value: 0 },
  uScan: { value: 1 },
  uScanStrength: { value: 1 },
  uNeon: { value: new THREE.Color(HOLO.neon) },
});

/**
 * Dark, satin body material with holographic accents: a neon rim (Fresnel), a scan band that
 * follows the animated scan rings, and fine horizontal scan lines. Built on MeshStandardMaterial
 * so skinning, normal maps and lights keep working; only the emissive term is extended.
 */
export function createHoloMaterial(uniforms: HoloUniforms, opts: { normalMap?: THREE.Texture | null; alphaMap?: THREE.Texture | null } = {}) {
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(HOLO.body),
    roughness: 0.38,
    metalness: 0.45,
    normalMap: opts.normalMap ?? null,
  });
  if (opts.normalMap) material.normalScale.set(0.8, 0.8);
  if (opts.alphaMap) {
    // Hair cards: the texture is only used for its transparency.
    material.map = opts.alphaMap;
    material.color.set('#2A302E');
    material.alphaTest = 0.4;
    material.side = THREE.DoubleSide;
  }
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vHoloPos;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvHoloPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying vec3 vHoloPos;\nuniform float uTime;\nuniform float uScan;\nuniform float uScanStrength;\nuniform vec3 uNeon;',
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        {
          vec3 holoN = normalize(normal);
          vec3 holoV = normalize(vViewPosition);
          float fres = pow(1.0 - clamp(abs(dot(holoN, holoV)), 0.0, 1.0), 3.2);
          float h = vHoloPos.y;
          float band = exp(-pow((h - uScan) * 22.0, 2.0));
          float lines = smoothstep(0.93, 1.0, 0.5 + 0.5 * sin(h * 240.0)) * 0.035;
          float flicker = 0.97 + 0.03 * sin(uTime * 5.0 + h * 4.0);
          totalEmissiveRadiance += uNeon * (fres * 0.55 + (band * 0.9 + lines) * uScanStrength) * flicker;
        }`,
      );
  };
  material.customProgramCacheKey = () => `diet9-holo-${opts.alphaMap ? 'a' : ''}${opts.normalMap ? 'n' : ''}`;
  return material;
}
