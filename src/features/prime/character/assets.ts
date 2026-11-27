import type { ImageSourcePropType } from 'react-native';

/**
 * Prime's official artwork (assets/prime). The reference render defines his look: round grey head,
 * glossy black eyes, black backwards cap, white towel, black shorts, black-and-white sneakers,
 * smartwatch – monochrome 3D.
 *
 * One entry per pose. Until a pose has its own render, it uses the official reference image
 * (`provided: false`), so Prime always looks the same – no other or invented characters.
 * To add a pose: put the file in assets/prime (transparent PNG or WebP, at least 1024 px), point the
 * entry at it and set `provided: true` (and `transparent: true` for cut-out images).
 * The list of missing poses is in docs/PRIME_CHARACTER.md.
 */
export type PrimeVariant = 'welcome' | 'today' | 'gym' | 'kitchen' | 'thinking' | 'chat' | 'success' | 'recovery' | 'motivation';

export interface PrimePose {
  source: ImageSourcePropType;
  /** A dedicated render for this pose exists (otherwise the reference image stands in). */
  provided: boolean;
  /** The image has a transparent background (otherwise it sits on its dark studio backdrop). */
  transparent: boolean;
}

const REFERENCE: ImageSourcePropType = require('../../../../assets/prime/prime-reference.jpg');

/** Head crop of the reference image, for small circles (tab bar, chat avatar). */
export const PRIME_FACE: ImageSourcePropType = require('../../../../assets/prime/prime-face.jpg');

const reference = (provided = false): PrimePose => ({ source: REFERENCE, provided, transparent: false });

export const PRIME_POSES: Record<PrimeVariant, PrimePose> = {
  welcome: reference(),
  // The reference render itself is the "today" pose (relaxed, thumbs up).
  today: reference(true),
  gym: reference(),
  kitchen: reference(),
  thinking: reference(),
  chat: reference(),
  success: reference(),
  recovery: reference(),
  motivation: reference(),
};

export const missingPoses = (): PrimeVariant[] => (Object.keys(PRIME_POSES) as PrimeVariant[]).filter((v) => !PRIME_POSES[v].provided);
