import * as THREE from 'three';

import { CLOTH_GLSL, FIELD_RANGE, type ClothParams } from './cloth';

/** Colours of the Today avatar stage (dark section only; the rest of the app keeps its theme). */
export const HOLO = {
  background: '#0A0C0D',
  neon: '#C8FF2E',
  green: '#4DFF9A',
  body: '#1B201F',
  cloth: '#08090A',
  hair: '#121513',
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
 * Body material: dark satin skin with holographic accents (neon Fresnel rim, a scan band that
 * follows the animated scan rings, fine scan lines), matte black sportswear with a thin neon hem,
 * and a sleek hair cap. Clothing and hair come from per-vertex masks plus analytic band edges
 * evaluated per pixel (see cloth.ts). Built on MeshStandardMaterial; only colour, roughness and
 * emissive are extended.
 *
 * The cloth parameters are uniforms, not baked into the shader text: three.js caches programs by
 * customProgramCacheKey, and per-body constants in the source would let one body's program (e.g.
 * without a top) be reused for another.
 */
export function createHoloMaterial(uniforms: HoloUniforms, cloth: ClothParams) {
  const material = new THREE.MeshStandardMaterial({ color: new THREE.Color(HOLO.body), roughness: 0.38, metalness: 0.45 });
  const own = {
    uCloth: { value: new THREE.Vector4(cloth.hem, cloth.waist, cloth.waistDrop, cloth.top ? 1 : 0) },
    uTop: { value: new THREE.Vector4(cloth.under, cloth.upper, cloth.scoop, cloth.bustY) },
    uStrap: { value: new THREE.Vector3(cloth.strapX, cloth.strapHalf, cloth.strapRise) },
    uClothColor: { value: new THREE.Color(HOLO.cloth) },
    uHairColor: { value: new THREE.Color(HOLO.hair) },
  };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms, own);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nattribute vec4 _clothmask;\nattribute vec4 _hair;\nvarying vec3 vHoloPos;\nvarying vec3 vLocal;\nvarying vec3 vMask;\nvarying float vHairField;',
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>\nvLocal = position;\nvMask = _clothmask.xyz * ${FIELD_RANGE.toFixed(3)};\nvHairField = _hair.x * ${FIELD_RANGE.toFixed(3)};`,
      )
      .replace('#include <project_vertex>', '#include <project_vertex>\nvHoloPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vHoloPos;
varying vec3 vLocal;
varying vec3 vMask;
varying float vHairField;
uniform float uTime;
uniform float uScan;
uniform float uScanStrength;
uniform vec3 uNeon;
uniform vec3 uClothColor;
uniform vec3 uHairColor;
${CLOTH_GLSL}`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float d9Field = d9ClothField(vLocal, vMask);
        float d9Cloth = smoothstep(-0.0012, 0.0012, d9Field);
        float d9Trim = d9Cloth * (1.0 - smoothstep(0.003, 0.006, d9Field));
        float d9Hair = smoothstep(-0.0015, 0.0015, vHairField) * (1.0 - d9Cloth);
        diffuseColor.rgb = mix(diffuseColor.rgb, uClothColor, d9Cloth);
        diffuseColor.rgb = mix(diffuseColor.rgb, uHairColor, d9Hair);`,
      )
      .replace(
        '#include <metalnessmap_fragment>',
        `#include <metalnessmap_fragment>
        metalnessFactor = mix(metalnessFactor, 0.05, d9Cloth);
        roughnessFactor = mix(roughnessFactor, 0.8, d9Cloth);
        roughnessFactor = mix(roughnessFactor, 0.3, d9Hair);`,
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
          float skin = 1.0 - 0.55 * d9Cloth;
          totalEmissiveRadiance += uNeon * (fres * 0.55 * skin + (band * 0.9 + lines) * uScanStrength) * flicker;
          totalEmissiveRadiance += uNeon * d9Trim * 0.95;
        }`,
      );
  };
  material.customProgramCacheKey = () => 'diet9-holo-body-v2';
  return material;
}
