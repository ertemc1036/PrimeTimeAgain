import type { Mutation } from '@/domain/mutations';
import type { AppData } from '@/domain/types';

/**
 * The persistence boundary. Screens never talk to storage; the app state applies a Mutation with the
 * pure reducer and hands both the mutation and the resulting data to the repository.
 *
 * - LocalRepository (today): stores the resulting document on the device.
 * - SupabaseRepository (planned): translates each mutation into row-level writes
 *   (profiles, user_goals, goal_actions, day_records, missions, reflections, measurements, …),
 *   protected by Row Level Security. See docs/ARCHITECTURE.md.
 */
export interface AppRepository {
  load(): Promise<AppData>;
  commit(mutation: Mutation, next: AppData): Promise<void>;
  reset(): Promise<void>;
}
