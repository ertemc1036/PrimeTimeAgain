import { z } from 'npm:zod@4.6.7';

/**
 * Structured AI outputs. The same schemas are used by the Supabase Edge Functions
 * (supabase/functions/_shared/schemas.ts must stay identical — enforced by a test) and by the app,
 * so an unexpected model response is rejected instead of shown.
 */
export const foodScanSchema = z.object({
  status: z.enum(['ok', 'not_food', 'unclear']),
  mealTitle: z.string().max(80),
  /** How sure the estimate is overall (photo clarity, hidden ingredients, portion depth). */
  confidence: z.enum(['high', 'medium', 'low']),
  items: z
    .array(
      z.object({
        name: z.string().min(1).max(60),
        estimatedGrams: z.number().min(0).max(2000),
        kcal: z.number().min(0).max(5000),
        protein: z.number().min(0).max(300),
        carbs: z.number().min(0).max(500),
        fat: z.number().min(0).max(300),
        confidence: z.enum(['high', 'medium', 'low']),
      }),
    )
    .max(15),
  uncertaintyNotes: z.array(z.string().max(200)).max(5),
});
export type FoodScanResult = z.infer<typeof foodScanSchema>;

export const workoutPhotoSchema = z.object({
  environment: z.enum(['gym', 'outdoor', 'home', 'unclear', 'other']),
  confidence: z.enum(['high', 'medium', 'low']),
  /** Short neutral description of what the photo appears to show. Never claims exercise happened. */
  summary: z.string().max(160),
});
export type WorkoutPhotoResult = z.infer<typeof workoutPhotoSchema>;

export const coachReplySchema = z.object({
  reply: z.string().min(1).max(4000),
  /** Set when the coach detected a safety concern and pointed to professional help. */
  safetyNotice: z.boolean().optional(),
});
export type CoachReply = z.infer<typeof coachReplySchema>;

/**
 * Prime, the AI agent: a reply plus actions it suggests. The model returns a flat object per action
 * (strict JSON schema: every field present, unused ones null); normalizePrimeActions turns that into
 * typed actions and drops anything incomplete. Nothing is saved until the user confirms an action.
 */
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
export const PRIME_ACTION_TYPES = ['log_water', 'log_meal', 'log_workout', 'log_rest_day', 'log_weight', 'remember'] as const;
const primeItemSchema = z.object({
  name: z.string().min(1).max(60),
  quantity: z.number().gt(0).max(10000),
  unit: z.string().min(1).max(20),
  grams: z.number().min(0).max(5000).nullable(),
  kcal: z.number().min(0).max(5000).nullable(),
  protein: z.number().min(0).max(300).nullable(),
  carbs: z.number().min(0).max(500).nullable(),
  fat: z.number().min(0).max(300).nullable(),
});
export const primeActionRawSchema = z.object({
  type: z.enum(PRIME_ACTION_TYPES),
  day: z.enum(['today', 'yesterday']).nullable(),
  ml: z.number().int().min(50).max(3000).nullable(),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).nullable(),
  title: z.string().max(80).nullable(),
  time: z.string().regex(TIME_RE).nullable(),
  items: z.array(primeItemSchema).max(15).nullable(),
  workoutType: z.enum(['gym', 'outdoor_walk', 'outdoor_run', 'home']).nullable(),
  durationMin: z.number().int().min(1).max(600).nullable(),
  description: z.string().max(200).nullable(),
  kg: z.number().min(30).max(350).nullable(),
  category: z.enum(['goal', 'food', 'routine', 'training', 'progress', 'challenge', 'motivation', 'other']).nullable(),
  text: z.string().max(300).nullable(),
});
export const primeReplySchema = z.object({
  reply: z.string().min(1).max(4000),
  actions: z.array(primeActionRawSchema).max(5),
});
export type PrimeReplyRaw = z.infer<typeof primeReplySchema>;
export type PrimeItem = z.infer<typeof primeItemSchema>;
type Day = 'today' | 'yesterday';
export type PrimeAction =
  | { type: 'log_water'; day: Day; ml: number }
  | { type: 'log_meal'; day: Day; mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'; title: string; time: string | null; items: PrimeItem[] }
  | { type: 'log_workout'; day: Day; workoutType: 'gym' | 'outdoor_walk' | 'outdoor_run' | 'home'; durationMin: number; time: string | null; description: string }
  | { type: 'log_rest_day'; day: Day }
  | { type: 'log_weight'; day: Day; kg: number }
  | { type: 'remember'; category: 'goal' | 'food' | 'routine' | 'training' | 'progress' | 'challenge' | 'motivation' | 'other'; text: string };

/** Typed, complete actions only; `allowMemory` false drops 'remember' (PrimeMe+ feature). */
export function normalizePrimeActions(raw: z.infer<typeof primeActionRawSchema>[], allowMemory: boolean): PrimeAction[] {
  const out: PrimeAction[] = [];
  for (const a of raw) {
    const day: Day = a.day === 'yesterday' ? 'yesterday' : 'today';
    switch (a.type) {
      case 'log_water':
        if (a.ml) out.push({ type: 'log_water', day, ml: a.ml });
        break;
      case 'log_meal':
        if (a.mealType && a.title?.trim() && a.items?.length) out.push({ type: 'log_meal', day, mealType: a.mealType, title: a.title.trim(), time: a.time, items: a.items });
        break;
      case 'log_workout':
        if (a.workoutType && a.durationMin) {
          const description = (a.description ?? '').trim();
          out.push({ type: 'log_workout', day, workoutType: a.workoutType, durationMin: a.durationMin, time: a.time, description: description.length >= 2 ? description : '' });
        }
        break;
      case 'log_rest_day':
        out.push({ type: 'log_rest_day', day });
        break;
      case 'log_weight':
        if (a.kg) out.push({ type: 'log_weight', day, kg: Math.round(a.kg * 10) / 10 });
        break;
      case 'remember':
        if (allowMemory && a.category && a.text && a.text.trim().length >= 3) out.push({ type: 'remember', category: a.category, text: a.text.trim() });
        break;
    }
  }
  return out;
}
