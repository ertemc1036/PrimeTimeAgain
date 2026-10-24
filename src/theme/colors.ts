/**
 * Brand palette. Bright, calm and natural: no dark backgrounds or neon.
 * Text colours are chosen to meet WCAG AA contrast on the light surfaces.
 */
export const palette = {
  offWhite: '#F8F7F2',
  sage: '#DCE9D8',
  green: '#54875B',
  lightBlue: '#C9E4F2',
  peach: '#F3D8B9',
  white: '#FFFFFF',

  // Supporting tones derived from the brand colours
  greenDeep: '#3B6542',
  greenSoft: '#EAF2E7',
  blueDeep: '#3D6E8A',
  blueSoft: '#E6F2F8',
  peachDeep: '#8A5A2E',
  peachSoft: '#FAEEE0',
  ink: '#22302A',
  inkSoft: '#5C6A62',
  inkMuted: '#636F68',
  line: '#E7E5DC',
  coral: '#B4533C',
  coralSoft: '#F7E3DC',
} as const;

export const colors = {
  background: palette.offWhite,
  surface: palette.white,
  surfaceAlt: palette.greenSoft,
  text: palette.ink,
  textSecondary: palette.inkSoft,
  textMuted: palette.inkMuted,
  textOnPrimary: palette.white,
  primary: palette.green,
  /** Filled buttons: slightly deeper than brand green so white labels pass WCAG AA. */
  primaryStrong: '#4A7A51',
  primaryText: palette.greenDeep,
  primaryPressed: palette.greenDeep,
  primarySoft: palette.sage,
  border: palette.line,
  danger: palette.coral,
  dangerSoft: palette.coralSoft,
  overlay: 'rgba(34, 48, 42, 0.35)',
} as const;

/** Each pillar has its own calm accent so it is recognisable at a glance. */
export const pillarColors = {
  body: { tint: palette.sage, soft: palette.greenSoft, strong: palette.greenDeep },
  mind: { tint: palette.lightBlue, soft: palette.blueSoft, strong: palette.blueDeep },
  life: { tint: palette.peach, soft: palette.peachSoft, strong: palette.peachDeep },
} as const;
