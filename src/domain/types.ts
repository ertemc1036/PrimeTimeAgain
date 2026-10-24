import type { AvatarConfig } from '@/avatar/types';

/** Local calendar date, formatted `YYYY-MM-DD`. */
export type ISODate = string;

/** Life areas. Goals belong to one area; Prime Control shows one module per area the user chose. */
export type AreaId = 'body' | 'mind' | 'money' | 'social' | 'lifestyle' | 'presence';
export const AREAS: readonly AreaId[] = ['body', 'mind', 'money', 'social', 'lifestyle', 'presence'];

export type GoalTemplateId =
  | 'lose_weight'
  | 'get_fit'
  | 'build_muscle'
  | 'look_better'
  | 'confidence'
  | 'discipline'
  | 'focus'
  | 'energy'
  | 'sleep'
  | 'habits'
  | 'make_money'
  | 'career'
  | 'business'
  | 'social_life'
  | 'communication'
  | 'style'
  | 'presence'
  | 'me_time'
  | 'lifestyle';

export type Difficulty = 1 | 2 | 3;

/** A reusable action from the catalogue. Text lives in i18n under `actions.<id>`. */
export interface ActionTemplate {
  id: string;
  minutes: number;
  difficulty: Difficulty;
  icon: string;
}

export interface GoalTemplate {
  id: GoalTemplateId;
  area: AreaId;
  icon: string;
  actions: string[];
}

/** One action in a user's goal plan: from the catalogue, or written by the user. */
export interface GoalAction {
  id: string;
  templateId?: string;
  /** Set for user-written actions. */
  title?: string;
  minutes: number;
  difficulty: Difficulty;
  active: boolean;
}

export interface UserGoal {
  id: string;
  /** null for goals the user created themselves. */
  templateId: GoalTemplateId | null;
  /** Name of a custom goal. */
  title?: string;
  area: AreaId;
  /** Where the user is starting from, in their words (optional). */
  startingPoint: string;
  /** What they want to reach (optional; a gentle default is shown when empty). */
  desiredOutcome: string;
  actions: GoalAction[];
  createdAt: string;
  archived: boolean;
}

export type MissionStatus = 'open' | 'done' | 'skipped' | 'postponed';

/** A concrete action planned for one day. Text is snapshotted so history stays stable when plans change. */
export interface Mission {
  id: string;
  goalId: string;
  actionId: string;
  actionTemplateId?: string;
  title?: string;
  minutes: number;
  difficulty: Difficulty;
  status: MissionStatus;
  completedAt?: string;
  /** Date this mission was postponed from. */
  carriedFrom?: ISODate;
}

export interface DayRecord {
  date: ISODate;
  missions: Mission[];
  /** False until the day's missions have been generated (a day can exist earlier with carried missions). */
  generated: boolean;
  /** A planned recovery day: counts as following the program. */
  recovery: boolean;
}

export type PrimeMemory = 'last_year' | 'one_two' | 'three_five' | 'five_plus' | 'first';

export interface StartingPoint {
  activity?: 'low' | 'some' | 'regular' | 'high';
  training?: 'home' | 'gym' | 'outdoors' | 'mixed';
  confidence?: string[];
  money?: string[];
  sleep?: 'poor' | 'ok' | 'good';
  priority?: 'routine' | 'free_time' | 'health' | 'order';
}

export interface ComebackProfile {
  name: string;
  memory?: PrimeMemory;
  memorySpecial?: string;
  memoryChanged?: string;
  memoryRegain?: string;
  startingPoint: StartingPoint;
  createdAt: string;
}

export interface Program {
  startDate: ISODate;
  durationDays: number;
  dailyMinutes: number;
}

export type Mood = 1 | 2 | 3 | 4 | 5;

export interface Reflection {
  id: string;
  date: ISODate;
  mood: Mood;
  promptKey?: string;
  body: string;
  createdAt: string;
}

export type MetricId = 'weight' | 'waist' | 'confidence' | 'energy';

export interface Measurement {
  id: string;
  date: ISODate;
  metric: MetricId;
  /** Stored in metric units (kg, cm) or on a 1–10 scale. */
  value: number;
  createdAt: string;
}

export interface ProgressPhoto {
  id: string;
  date: ISODate;
  /** Local file inside the app's private documents folder. Never uploaded. */
  uri: string;
  createdAt: string;
}

export interface Preferences {
  reminders: boolean;
  reminderTime: string;
  units: 'metric' | 'imperial';
  /** Consent for a future AI coach to read reflections. Off by default. */
  coachUsesReflections: boolean;
}

export interface AppData {
  version: 2;
  profile: ComebackProfile | null;
  program: Program | null;
  goals: UserGoal[];
  days: Record<ISODate, DayRecord>;
  reflections: Reflection[];
  measurements: Measurement[];
  photos: ProgressPhoto[];
  avatar: AvatarConfig | null;
  preferences: Preferences;
}

export const defaultPreferences = (): Preferences => ({
  reminders: false,
  reminderTime: '20:00',
  units: 'metric',
  coachUsesReflections: false,
});

export const emptyAppData = (): AppData => ({
  version: 2,
  profile: null,
  program: null,
  goals: [],
  days: {},
  reflections: [],
  measurements: [],
  photos: [],
  avatar: null,
  preferences: defaultPreferences(),
});
