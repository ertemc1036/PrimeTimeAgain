import type { Mutation } from '@/domain/mutations';
import type { AppData } from '@/domain/types';

/**
 * Persistence boundary. Screens never touch storage: they dispatch a Mutation, the pure reducer
 * produces the next AppData, and the repository persists it.
 *
 * - LocalRepository (active): on-device storage, works fully offline.
 * - Cloud sync (prepared, needs Supabase): mutations are mapped to row writes on the tables in
 *   supabase/migrations, protected by Row Level Security. See docs/BACKEND.md.
 */
export interface AppRepository {
  load(): Promise<AppData>;
  commit(mutation: Mutation, prev: AppData, next: AppData): Promise<void>;
  reset(): Promise<void>;
}
