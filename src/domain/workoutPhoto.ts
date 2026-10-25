import type { WorkoutPhotoResult } from './aiSchemas';
import type { EnvironmentAssessment, WorkoutType } from './types';

const EXPECTED: Record<WorkoutType, WorkoutPhotoResult['environment']> = {
  gym: 'gym',
  outdoor_walk: 'outdoor',
  outdoor_run: 'outdoor',
  home: 'home',
};

export type PhotoOutcome = 'recognized' | 'uncertain' | 'mismatch';

/**
 * Turn a classification into a user-facing outcome. A photo is context for a self-reported entry,
 * never proof that exercise happened; every outcome still lets the user save or log manually.
 */
export function assessPhoto(result: WorkoutPhotoResult, selected: WorkoutType): { outcome: PhotoOutcome; assessment: EnvironmentAssessment } {
  const matches = result.environment === EXPECTED[selected];
  const outcome: PhotoOutcome =
    result.environment === 'unclear' || (matches && result.confidence === 'low') ? 'uncertain' : matches ? 'recognized' : 'mismatch';
  return {
    outcome,
    assessment: { environment: result.environment, confidence: result.confidence, matchesSelected: matches, summary: result.summary },
  };
}
