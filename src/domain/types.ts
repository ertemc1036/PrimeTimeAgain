/** Local calendar date `YYYY-MM-DD` (the user's own day, never a UTC boundary). */
export type ISODate = string;
/** Local wall-clock time `HH:MM`. */
export type LocalTime = string;

export type Units = 'metric' | 'imperial';
export type GoalType = 'habits' | 'nutrition' | 'active' | 'weight';
export type ActivityPreference = 'gym' | 'walking' | 'running' | 'home' | 'combination';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export const MEAL_TYPES: readonly MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export type WorkoutType = 'gym' | 'outdoor_walk' | 'outdoor_run' | 'home';
export type PlannedActivityType = WorkoutType | 'rest';

export interface Macros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

/** One food in a meal. `nutrition` is null when no credible estimate exists. */
export interface FoodItem {
  id: string;
  name: string;
  /** Reference to the built-in or a custom food, when the item came from a database. */
  foodId?: string;
  quantity: number;
  unit: string;
  grams?: number;
  nutrition: Macros | null;
}

export interface FoodPreferences {
  preferred: string[];
  restrictions: string[];
  allergies: string[];
  dislikes: string[];
}

export interface Profile {
  name: string;
  /** User confirmed they are 18 or older. Required to use the app. */
  adultConfirmed: boolean;
  heightCm?: number;
  units: Units;
  goals: GoalType[];
  startWeightKg?: number;
  goalWeightKg?: number;
  activityPrefs: ActivityPreference[];
  food: FoodPreferences;
  planningTime: LocalTime;
  createdAt: string;
  onboardingCompletedAt: string;
}

export interface PlannedMeal {
  id: string;
  mealType: MealType;
  title: string;
  items: FoodItem[];
  time?: LocalTime;
  notes?: string;
}

export interface PlannedActivity {
  type: PlannedActivityType;
  time?: LocalTime;
  durationMin?: number;
  notes?: string;
}

/** The plan for one date (created the day before). */
export interface DayPlan {
  date: ISODate;
  meals: PlannedMeal[];
  /** Explicit "flexible / no meals planned" choice, so nobody has to invent meals. */
  flexibleMeals: boolean;
  activity: PlannedActivity | null;
  /** Set when the user taps "Save Tomorrow's Plan". */
  savedAt?: string;
  /** Local date on which the plan was saved. */
  savedOn?: ISODate;
  updatedAt: string;
}

export type EntryMethod = 'manual' | 'plan' | 'ai';

export interface FoodLog {
  id: string;
  date: ISODate;
  /** Absolute timestamp of eating, plus the local wall time the user saw. */
  consumedAt: string;
  time: LocalTime;
  mealType: MealType;
  title: string;
  items: FoodItem[];
  notes?: string;
  entryMethod: EntryMethod;
  /** The planned meal this entry was logged from, if any. */
  planMealId?: string;
  /** Nutrition came from an AI photo estimate (always labelled as such). */
  aiEstimated?: boolean;
  /** Logged outside the optional eating window (informational only). */
  outsideWindow?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FoodCompletion {
  date: ISODate;
  completedAt: string;
}

export type EnvironmentClass = 'gym' | 'outdoor' | 'home' | 'unclear' | 'other';

export interface EnvironmentAssessment {
  environment: EnvironmentClass;
  confidence: 'high' | 'medium' | 'low';
  matchesSelected: boolean;
  summary: string;
}

export interface ActivityLog {
  id: string;
  date: ISODate;
  type: WorkoutType;
  startTime: LocalTime;
  durationMin: number;
  description: string;
  /** 'manual' = self-reported; 'photo' = self-reported with an optional AI-described photo for context. */
  entryMethod: 'manual' | 'photo';
  /** Local file on this device (never synced). */
  photoUri?: string;
  /** Private cloud copy: "<user id>/<id>.jpg" in the workout-photos bucket. */
  photoPath?: string;
  aiEnvironment?: EnvironmentAssessment;
  createdAt: string;
  updatedAt: string;
}

export interface RecoveryLog {
  date: ISODate;
  createdAt: string;
}

export interface WeightEntry {
  id: string;
  date: ISODate;
  kg: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProgressPhoto {
  id: string;
  date: ISODate;
  /** Local file on this device; empty when the photo exists only in the cloud (another device). */
  uri: string;
  /** Private cloud copy: "<user id>/<id>.jpg" in the progress-photos bucket. */
  storagePath?: string;
  createdAt: string;
}

export interface SavedMeal {
  id: string;
  title: string;
  mealType?: MealType;
  items: FoodItem[];
  favorite: boolean;
  lastUsedAt: string;
}

export interface CustomFood {
  id: string;
  name: string;
  /** Nutrition per serving as entered by the user. */
  servingLabel: string;
  servingGrams?: number;
  perServing: Macros;
}

export type DisciplineMode = 'light' | 'smart' | 'focused' | 'hourly';

export interface NotificationPrefs {
  enabled: boolean;
  mode: DisciplineMode;
  paused: boolean;
  morningTime: LocalTime;
  quietStart: LocalTime;
  quietEnd: LocalTime;
  hourlyStart: LocalTime;
  hourlyEnd: LocalTime;
}

export interface EatingWindow {
  enabled: boolean;
  start: LocalTime;
  end: LocalTime;
  reminders: boolean;
}

export interface JourneySettings {
  /** Optional 7-month program. */
  programEnabled: boolean;
  startDate?: ISODate;
  maintenance: boolean;
}

export interface Achievement {
  id: string;
  earnedAt: string;
}

export interface CoachMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface AppData {
  version: 1;
  profile: Profile | null;
  plans: Record<ISODate, DayPlan>;
  foodLogs: FoodLog[];
  foodCompletions: Record<ISODate, FoodCompletion>;
  activityLogs: ActivityLog[];
  recoveryLogs: Record<ISODate, RecoveryLog>;
  weights: WeightEntry[];
  photos: ProgressPhoto[];
  savedMeals: SavedMeal[];
  customFoods: CustomFood[];
  notifications: NotificationPrefs;
  eatingWindow: EatingWindow;
  journey: JourneySettings;
  achievements: Achievement[];
  coach: { consentToContext: boolean; messages: CoachMessage[] };
}

export const defaultNotifications = (): NotificationPrefs => ({
  enabled: false,
  mode: 'light',
  paused: false,
  morningTime: '08:00',
  quietStart: '22:00',
  quietEnd: '07:00',
  hourlyStart: '09:00',
  hourlyEnd: '20:00',
});

export const emptyAppData = (): AppData => ({
  version: 1,
  profile: null,
  plans: {},
  foodLogs: [],
  foodCompletions: {},
  activityLogs: [],
  recoveryLogs: {},
  weights: [],
  photos: [],
  savedMeals: [],
  customFoods: [],
  notifications: defaultNotifications(),
  eatingWindow: { enabled: false, start: '08:00', end: '20:00', reminders: false },
  journey: { programEnabled: false, maintenance: false },
  achievements: [],
  coach: { consentToContext: false, messages: [] },
});
