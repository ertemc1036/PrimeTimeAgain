export type Pillar = 'body' | 'mind' | 'life';
export const PILLARS: readonly Pillar[] = ['body', 'mind', 'life'];

/** Local calendar date, formatted `YYYY-MM-DD`. */
export type ISODate = string;

export type GoalId = string;

export interface GoalDefinition {
  id: GoalId;
  pillar: Pillar;
  /** Feather icon name. */
  icon: string;
  /** Suggested minutes per day. */
  minutes: number;
}

export type DailyMinutes = 10 | 20 | 30;

export interface Profile {
  name: string;
  startDate: ISODate;
  dailyMinutes: DailyMinutes;
  focusPillars: Pillar[];
  createdAt: string;
}

/** Completed goal ids per day. */
export type CompletionLog = Record<ISODate, GoalId[]>;

export type Mood = 1 | 2 | 3 | 4 | 5;

export interface Reflection {
  id: string;
  date: ISODate;
  mood: Mood;
  /** i18n key of the prompt the user answered, if any. */
  promptKey?: string;
  body: string;
  createdAt: string;
}

export interface Preferences {
  reminders: boolean;
}

export interface AppData {
  version: 1;
  profile: Profile | null;
  goalIds: GoalId[];
  log: CompletionLog;
  reflections: Reflection[];
  preferences: Preferences;
}

export const emptyAppData = (): AppData => ({
  version: 1,
  profile: null,
  goalIds: [],
  log: {},
  reflections: [],
  preferences: { reminders: false },
});
