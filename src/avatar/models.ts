/* eslint-disable @typescript-eslint/no-require-imports -- Metro bundles assets through require(). */
import type { AvatarBody } from '@/domain/types';

/**
 * Avatar bodies built from MakeHuman assets (CC0 1.0, see assets/avatars/LICENSE-MAKEHUMAN-ASSETS.md)
 * by scripts/avatars/build_makehuman.py. Each GLB has the goal (fit) body, the start (heavier)
 * body as a morph target, sportswear masks and the hair field.
 */
export const BODY_MODELS: Record<AvatarBody, number> = {
  male: require('../../assets/avatars/body-male.glb'),
  female: require('../../assets/avatars/body-female.glb'),
  neutral: require('../../assets/avatars/body-neutral.glb'),
};

/** Which body is shown: the start or goal state, or a blend between them (0 = goal … 1 = start, see src/domain/bodyScan.ts). */
export type BodyShape = 'start' | 'goal' | number;

/** Blend value for a shape: 1 = start body, 0 = goal body. */
export const shapeBlend = (shape: BodyShape): number => (shape === 'start' ? 1 : shape === 'goal' ? 0 : Math.min(1, Math.max(0, shape)));
