import type { GoalDefinition, GoalId, Pillar } from './types';

/**
 * Goal catalogue. Text lives in i18n under `goals.<id>.title` and `goals.<id>.task`.
 * Goals are small, realistic daily actions: no extreme or medical promises.
 */
export const GOALS: readonly GoalDefinition[] = [
  { id: 'walk', pillar: 'body', icon: 'sun', minutes: 20 },
  { id: 'strength', pillar: 'body', icon: 'activity', minutes: 10 },
  { id: 'hydrate', pillar: 'body', icon: 'droplet', minutes: 1 },
  { id: 'mobility', pillar: 'body', icon: 'wind', minutes: 5 },
  { id: 'sleep', pillar: 'body', icon: 'moon', minutes: 10 },

  { id: 'breathe', pillar: 'mind', icon: 'feather', minutes: 5 },
  { id: 'gratitude', pillar: 'mind', icon: 'heart', minutes: 3 },
  { id: 'focus', pillar: 'mind', icon: 'target', minutes: 25 },
  { id: 'read', pillar: 'mind', icon: 'book-open', minutes: 10 },
  { id: 'kindness', pillar: 'mind', icon: 'smile', minutes: 2 },

  { id: 'plan', pillar: 'life', icon: 'edit-3', minutes: 5 },
  { id: 'reset', pillar: 'life', icon: 'home', minutes: 10 },
  { id: 'connect', pillar: 'life', icon: 'message-circle', minutes: 5 },
  { id: 'learn', pillar: 'life', icon: 'compass', minutes: 15 },
  { id: 'outdoors', pillar: 'life', icon: 'map', minutes: 15 },
];

const byId = new Map(GOALS.map((g) => [g.id, g]));

export const getGoal = (id: GoalId): GoalDefinition | undefined => byId.get(id);

export const goalsForPillar = (pillar: Pillar): GoalDefinition[] => GOALS.filter((g) => g.pillar === pillar);

/** Sensible starting goals: one per chosen pillar, more if the user has more time. */
export const suggestedGoals = (pillars: Pillar[], dailyMinutes: number): GoalId[] => {
  const perPillar = dailyMinutes >= 30 ? 2 : 1;
  return pillars.flatMap((p) => goalsForPillar(p).slice(0, perPillar).map((g) => g.id));
};

export const MAX_ACTIVE_GOALS = 9;
