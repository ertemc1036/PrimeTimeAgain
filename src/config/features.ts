/**
 * Switches for features that exist in the code but are not shown in this version.
 *
 * bodyVisualizer3D: the illustrative 3D body (src/avatar, src/features/avatar/BodyHero.tsx). Kept for
 * a later redesign; while off, /body-journey opens the progress overview instead and the avatar-body
 * setting is hidden. Prime is the only 3D character in the app.
 */
export const FEATURES = {
  bodyVisualizer3D: false,
} as const;
