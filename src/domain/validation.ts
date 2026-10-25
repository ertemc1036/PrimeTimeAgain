import { z } from 'zod';

import { parseTime } from './dates';
import type { ActivityLog, MealType, WorkoutType } from './types';

/**
 * Form validation. Messages are i18n keys (under `validation.*`) so every error is translated
 * and points at the missing field.
 */
const time = (key: string) => z.string().refine((v) => parseTime(v) !== null, { message: key });

export const workoutSchema = z.object({
  type: z.enum(['gym', 'outdoor_walk', 'outdoor_run', 'home'], { message: 'validation.activityType' }),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'validation.date' }),
  startTime: time('validation.startTime'),
  durationMin: z
    .number({ message: 'validation.duration' })
    .int({ message: 'validation.duration' })
    .min(1, { message: 'validation.duration' })
    .max(600, { message: 'validation.durationMax' }),
  description: z
    .string()
    .trim()
    .min(2, { message: 'validation.description' })
    .max(200, { message: 'validation.descriptionMax' }),
});

export type WorkoutInput = z.infer<typeof workoutSchema>;
export type FieldErrors<K extends string> = Partial<Record<K, string>>;

export interface WorkoutDraft {
  type?: WorkoutType;
  date: string;
  startTime: string;
  durationMin?: number;
  description: string;
}

export function validateWorkout(draft: WorkoutDraft): { ok: true; value: WorkoutInput } | { ok: false; errors: FieldErrors<keyof WorkoutInput> } {
  const r = workoutSchema.safeParse(draft);
  if (r.success) return { ok: true, value: r.data };
  const errors: FieldErrors<keyof WorkoutInput> = {};
  for (const issue of r.error.issues) {
    const k = issue.path[0] as keyof WorkoutInput;
    if (!errors[k]) errors[k] = issue.message;
  }
  return { ok: false, errors };
}

export const foodSchema = z.object({
  title: z.string().trim().min(1, { message: 'validation.foodName' }).max(80, { message: 'validation.foodNameMax' }),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack'], { message: 'validation.mealType' }),
  time: time('validation.time'),
  quantity: z.number({ message: 'validation.quantity' }).positive({ message: 'validation.quantity' }).max(5000, { message: 'validation.quantity' }),
});

export interface FoodDraft {
  title: string;
  mealType?: MealType;
  time: string;
  quantity?: number;
}

export function validateFood(draft: FoodDraft): { ok: true } | { ok: false; errors: FieldErrors<keyof FoodDraft> } {
  const r = foodSchema.safeParse(draft);
  if (r.success) return { ok: true };
  const errors: FieldErrors<keyof FoodDraft> = {};
  for (const issue of r.error.issues) {
    const k = issue.path[0] as keyof FoodDraft;
    if (!errors[k]) errors[k] = issue.message;
  }
  return { ok: false, errors };
}

/** Two workouts count as duplicates when type, date, time and duration all match. */
export const isDuplicateWorkout = (logs: ActivityLog[], w: Pick<ActivityLog, 'id' | 'type' | 'date' | 'startTime' | 'durationMin'>) =>
  logs.some((l) => l.id !== w.id && l.type === w.type && l.date === w.date && l.startTime === w.startTime && l.durationMin === w.durationMin);
