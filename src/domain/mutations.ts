import { canEditCheckIns, canEditPlan } from './completion';
import { isDuplicateWorkout } from './validation';
import type {
  ActivityLog,
  AppData,
  CoachMessage,
  CustomFood,
  DayPlan,
  EatingWindow,
  FoodLog,
  ISODate,
  JourneySettings,
  NotificationPrefs,
  Profile,
  ProgressPhoto,
  SavedMeal,
  WeightEntry,
} from './types';

/**
 * Every change is a typed Mutation applied by one pure reducer. The UI applies it optimistically,
 * the local store persists the result, and a cloud repository can map it to table writes.
 * Business rules (grace window, duplicates) are enforced here, not in screens.
 */
export type Mutation =
  | { type: 'replaceAll'; data: AppData }
  | { type: 'completeOnboarding'; profile: Profile; journey: JourneySettings; notifications: NotificationPrefs }
  | { type: 'updateProfile'; patch: Partial<Profile> }
  | { type: 'savePlan'; plan: DayPlan }
  | { type: 'upsertFood'; log: FoodLog }
  | { type: 'deleteFood'; id: string }
  | { type: 'finishFoodLog'; date: ISODate; at: string }
  | { type: 'reopenFoodLog'; date: ISODate }
  | { type: 'upsertActivity'; log: ActivityLog }
  | { type: 'deleteActivity'; id: string }
  | { type: 'saveRestDay'; date: ISODate; at: string }
  | { type: 'removeRestDay'; date: ISODate }
  | { type: 'upsertWeight'; entry: WeightEntry }
  | { type: 'deleteWeight'; id: string }
  | { type: 'addPhoto'; photo: ProgressPhoto }
  | { type: 'deletePhoto'; id: string }
  | { type: 'upsertSavedMeal'; meal: SavedMeal }
  | { type: 'deleteSavedMeal'; id: string }
  | { type: 'upsertCustomFood'; food: CustomFood }
  | { type: 'updateNotifications'; patch: Partial<NotificationPrefs> }
  | { type: 'updateEatingWindow'; patch: Partial<EatingWindow> }
  | { type: 'updateJourney'; patch: Partial<JourneySettings> }
  | { type: 'addCoachMessage'; message: CoachMessage }
  | { type: 'clearCoach' }
  | { type: 'setCoachConsent'; value: boolean }
  | { type: 'deleteAllFood' }
  | { type: 'deleteAllActivity' };

export type RejectReason = 'locked' | 'duplicate' | 'notFound' | 'empty';
export class MutationRejected extends Error {
  constructor(public reason: RejectReason) {
    super(reason);
  }
}

const upsertById = <T extends { id: string }>(list: T[], item: T) =>
  list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];

const omit = <T>(rec: Record<string, T>, key: string) => {
  const next = { ...rec };
  delete next[key];
  return next;
};

/** Apply a mutation. Throws MutationRejected when a business rule forbids the change. */
export function applyMutation(data: AppData, m: Mutation, today: ISODate): AppData {
  const requireCheckInWindow = (date: ISODate) => {
    if (!canEditCheckIns(date, today)) throw new MutationRejected('locked');
  };
  const dateOf = <T extends { id: string; date: ISODate }>(list: T[], id: string) => {
    const found = list.find((x) => x.id === id);
    if (!found) throw new MutationRejected('notFound');
    return found.date;
  };

  switch (m.type) {
    case 'replaceAll':
      return m.data;
    case 'completeOnboarding':
      return { ...data, profile: m.profile, journey: m.journey, notifications: m.notifications };
    case 'updateProfile':
      return data.profile ? { ...data, profile: { ...data.profile, ...m.patch } } : data;
    case 'savePlan':
      if (!canEditPlan(m.plan.date, today)) throw new MutationRejected('locked');
      return { ...data, plans: { ...data.plans, [m.plan.date]: m.plan } };
    case 'upsertFood': {
      requireCheckInWindow(m.log.date);
      const existing = data.foodLogs.find((f) => f.id === m.log.id);
      if (existing) requireCheckInWindow(existing.date);
      return { ...data, foodLogs: upsertById(data.foodLogs, m.log) };
    }
    case 'deleteFood': {
      requireCheckInWindow(dateOf(data.foodLogs, m.id));
      return { ...data, foodLogs: data.foodLogs.filter((f) => f.id !== m.id) };
    }
    case 'finishFoodLog':
      requireCheckInWindow(m.date);
      if (!data.foodLogs.some((f) => f.date === m.date)) throw new MutationRejected('empty');
      return { ...data, foodCompletions: { ...data.foodCompletions, [m.date]: { date: m.date, completedAt: m.at } } };
    case 'reopenFoodLog':
      requireCheckInWindow(m.date);
      return { ...data, foodCompletions: omit(data.foodCompletions, m.date) };
    case 'upsertActivity': {
      requireCheckInWindow(m.log.date);
      const existing = data.activityLogs.find((a) => a.id === m.log.id);
      if (existing) requireCheckInWindow(existing.date);
      if (isDuplicateWorkout(data.activityLogs, m.log)) throw new MutationRejected('duplicate');
      return { ...data, activityLogs: upsertById(data.activityLogs, m.log) };
    }
    case 'deleteActivity':
      requireCheckInWindow(dateOf(data.activityLogs, m.id));
      return { ...data, activityLogs: data.activityLogs.filter((a) => a.id !== m.id) };
    case 'saveRestDay':
      requireCheckInWindow(m.date);
      if (data.recoveryLogs[m.date]) return data; // idempotent: never duplicated
      return { ...data, recoveryLogs: { ...data.recoveryLogs, [m.date]: { date: m.date, createdAt: m.at } } };
    case 'removeRestDay':
      requireCheckInWindow(m.date);
      return { ...data, recoveryLogs: omit(data.recoveryLogs, m.date) };
    case 'upsertWeight':
      return { ...data, weights: upsertById(data.weights, m.entry).sort((a, b) => (a.date < b.date ? -1 : 1)) };
    case 'deleteWeight':
      return { ...data, weights: data.weights.filter((w) => w.id !== m.id) };
    case 'addPhoto':
      return { ...data, photos: [...data.photos, m.photo] };
    case 'deletePhoto':
      return { ...data, photos: data.photos.filter((p) => p.id !== m.id) };
    case 'upsertSavedMeal':
      return { ...data, savedMeals: upsertById(data.savedMeals, m.meal) };
    case 'deleteSavedMeal':
      return { ...data, savedMeals: data.savedMeals.filter((s) => s.id !== m.id) };
    case 'upsertCustomFood':
      return { ...data, customFoods: upsertById(data.customFoods, m.food) };
    case 'updateNotifications':
      return { ...data, notifications: { ...data.notifications, ...m.patch } };
    case 'updateEatingWindow':
      return { ...data, eatingWindow: { ...data.eatingWindow, ...m.patch } };
    case 'updateJourney':
      return { ...data, journey: { ...data.journey, ...m.patch } };
    case 'addCoachMessage':
      return { ...data, coach: { ...data.coach, messages: [...data.coach.messages, m.message] } };
    case 'clearCoach':
      return { ...data, coach: { ...data.coach, messages: [] } };
    case 'setCoachConsent':
      return { ...data, coach: { ...data.coach, consentToContext: m.value } };
    case 'deleteAllFood':
      return { ...data, foodLogs: [], foodCompletions: {}, savedMeals: [] };
    case 'deleteAllActivity':
      return { ...data, activityLogs: [], recoveryLogs: {} };
  }
}
