export type AvatarGender = 'm' | 'f';

/** Animation the avatar plays while idle. */
export type AvatarPose = 'breathe' | 'look';

/** Lighting set around the avatar. */
export type AvatarLighting = 'studio' | 'dusk' | 'cool';

export interface AvatarConfig {
  presetId: string;
  pose: AvatarPose;
  lighting: AvatarLighting;
}

export interface AvatarPreset {
  id: string;
  gender: AvatarGender;
  model: number;
  textures: { body: number; bodyNormal: number; head: number; headNormal: number; hair: number | null };
  /** Rocketbox reference render, used in pickers and as a fallback when 3D is unavailable. */
  preview: number;
}

export const DEFAULT_AVATAR: AvatarConfig = { presetId: 'm09', pose: 'breathe', lighting: 'studio' };
