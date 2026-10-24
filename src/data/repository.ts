import type { AppData, GoalId, ISODate, Preferences, Profile, Reflection } from '@/domain/types';

/**
 * The database boundary. The UI never talks to storage directly; it goes through
 * the app state, which uses this interface. The prototype uses local storage;
 * a Supabase implementation will plug in here without changing any screen.
 */
export interface AppRepository {
  load(): Promise<AppData>;
  saveProfile(profile: Profile): Promise<void>;
  saveGoals(goalIds: GoalId[]): Promise<void>;
  setCompletion(date: ISODate, goalId: GoalId, done: boolean): Promise<void>;
  addReflection(reflection: Reflection): Promise<void>;
  savePreferences(preferences: Preferences): Promise<void>;
  /** Replace everything at once (used for onboarding and sample data). */
  replaceAll(data: AppData): Promise<void>;
  reset(): Promise<void>;
}
