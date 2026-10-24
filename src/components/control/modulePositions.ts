/** Slots around the avatar: column (left/right) and row (0 = top … 2 = bottom). */
export type Slot = { side: 'left' | 'right'; row: 0 | 1 | 2 };

const L = (row: 0 | 1 | 2): Slot => ({ side: 'left', row });
const R = (row: 0 | 1 | 2): Slot => ({ side: 'right', row });

/** Balanced layouts for 1–6 modules so the avatar always stays the centrepiece. */
export const SLOT_LAYOUTS: Record<number, Slot[]> = {
  1: [R(1)],
  2: [L(1), R(1)],
  3: [L(0), R(1), L(2)],
  4: [L(0), R(0), L(2), R(2)],
  5: [L(0), R(0), L(2), R(2), R(1)],
  6: [L(0), R(0), L(1), R(1), L(2), R(2)],
};
