/* eslint-disable @typescript-eslint/no-require-imports -- Metro bundles assets through require(). */
/**
 * 3D bodies from the Microsoft Rocketbox Avatar Library (MIT License, see
 * assets/avatars/LICENSE-ROCKETBOX.txt). Built by scripts/avatars/build_avatars.py.
 * Only the files the hologram look needs are shipped: mesh + rig, normal maps for surface
 * detail, the hair texture (used for its transparency) and one idle animation per rig.
 * The neutral body is generated in code (src/avatar/mannequin.ts) and needs no asset.
 */
export interface RiggedBody {
  id: string;
  model: number;
  normals: { body: number; head: number };
  hair: number | null;
  idle: number;
}

export const RIGGED_BODIES: Record<'male' | 'female', RiggedBody> = {
  male: {
    id: 'm09',
    model: require('../../assets/avatars/m09/model.glb'),
    normals: { body: require('../../assets/avatars/m09/body_n.jpg'), head: require('../../assets/avatars/m09/head_n.jpg') },
    hair: require('../../assets/avatars/m09/hair.png'),
    idle: require('../../assets/avatars/animations/idle_m.glb'),
  },
  female: {
    id: 'f13',
    model: require('../../assets/avatars/f13/model.glb'),
    normals: { body: require('../../assets/avatars/f13/body_n.jpg'), head: require('../../assets/avatars/f13/head_n.jpg') },
    hair: require('../../assets/avatars/f13/hair.png'),
    idle: require('../../assets/avatars/animations/idle_f.glb'),
  },
};
