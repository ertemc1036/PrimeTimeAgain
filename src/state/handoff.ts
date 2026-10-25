import type { EnvironmentAssessment, FoodItem, WorkoutType } from '@/domain/types';

/**
 * Short-lived, in-memory hand-off between screens (e.g. AI scan result → editable form).
 * Values are taken once; nothing here is persisted.
 */
export interface ScanHandoff {
  title: string;
  items: FoodItem[];
}
export interface WorkoutPhotoHandoff {
  type: WorkoutType;
  photoUri: string;
  assessment: EnvironmentAssessment;
}

const store: { scan?: ScanHandoff; workoutPhoto?: WorkoutPhotoHandoff } = {};

export const putScan = (v: ScanHandoff) => (store.scan = v);
export const takeScan = () => {
  const v = store.scan;
  store.scan = undefined;
  return v;
};
export const putWorkoutPhoto = (v: WorkoutPhotoHandoff) => (store.workoutPhoto = v);
export const takeWorkoutPhoto = () => {
  const v = store.workoutPhoto;
  store.workoutPhoto = undefined;
  return v;
};
