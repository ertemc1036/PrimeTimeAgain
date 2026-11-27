import type { ImageSourcePropType } from 'react-native';

/**
 * Prime's official artwork (assets/images/prime, 1024 px WebP, dark studio backgrounds). He always
 * looks the same: round grey head, glossy black eyes, black backwards cap, white towel, black shorts,
 * black-and-white sneakers, smartwatch – monochrome 3D. No other characters are used.
 *
 * One entry per pose. Poses without their own render use the neutral default image (`provided:
 * false`). To add one: put the file in assets/images/prime, point the entry at it and set
 * `provided: true` (`transparent: true` for cut-out images). See docs/PRIME_CHARACTER.md.
 */
export type PrimeVariant = 'welcome' | 'today' | 'chat' | 'motivation' | 'thinking' | 'gym' | 'workout' | 'success' | 'recovery' | 'kitchen' | 'nutrition';

export interface PrimePose {
  source: ImageSourcePropType;
  /** A dedicated render for this pose exists (otherwise the neutral default stands in). */
  provided: boolean;
  /** The image has a transparent background (otherwise it sits on its dark studio backdrop). */
  transparent: boolean;
}

const IMG = {
  default: require('../../../../assets/images/prime/prime-default.webp') as ImageSourcePropType,
  gym: require('../../../../assets/images/prime/prime-gym.webp') as ImageSourcePropType,
  workout: require('../../../../assets/images/prime/prime-workout.webp') as ImageSourcePropType,
  shake: require('../../../../assets/images/prime/prime-shake.webp') as ImageSourcePropType,
  kitchen: require('../../../../assets/images/prime/prime-kitchen.webp') as ImageSourcePropType,
  thumbsUp: require('../../../../assets/images/prime/prime-thumbsup.webp') as ImageSourcePropType,
};

/** Head crop of the neutral pose, for small circles (tab bar, chat avatar). */
export const PRIME_FACE: ImageSourcePropType = require('../../../../assets/images/prime/prime-face.webp');

const pose = (source: ImageSourcePropType, provided = true): PrimePose => ({ source, provided, transparent: false });

export const PRIME_POSES: Record<PrimeVariant, PrimePose> = {
  // Neutral pose (image 3): Today, onboarding, welcome, chat, PrimeMe+.
  welcome: pose(IMG.default),
  today: pose(IMG.default),
  chat: pose(IMG.default),
  motivation: pose(IMG.default),
  // Dumbbell (image 1): Gym start page, training motivation.
  gym: pose(IMG.gym),
  // Bench press (image 2): training plan, workout start, active training.
  workout: pose(IMG.workout),
  // Thumbs up (first reference render): a finished training or day.
  success: pose(IMG.thumbsUp),
  // Snack (image 5): kitchen overview, meals and snacks, food diary.
  kitchen: pose(IMG.kitchen),
  // Protein shake (image 4): nutrition, protein, meal planning.
  nutrition: pose(IMG.shake),
  // No dedicated render yet: the neutral pose stands in.
  thinking: pose(IMG.default, false),
  recovery: pose(IMG.default, false),
};

export const missingPoses = (): PrimeVariant[] => (Object.keys(PRIME_POSES) as PrimeVariant[]).filter((v) => !PRIME_POSES[v].provided);
