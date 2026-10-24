import type { GoalId } from '@/domain/types';

/**
 * Helpers for dynamic keys. Goal ids come from the catalogue, so we build the key here
 * once instead of casting in every component. The translation parity test guarantees
 * every catalogue id has a title and task in each language.
 */
type GoalKey = `goals.${'walk'}.${'title' | 'task'}`;

export const goalKey = (id: GoalId, field: 'title' | 'task') => `goals.${id}.${field}` as GoalKey;
