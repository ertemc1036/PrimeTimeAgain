import { z } from 'zod';

/**
 * Structured AI outputs. The same schemas are used by the Supabase Edge Functions
 * (supabase/functions/_shared/schemas.ts must stay identical — enforced by a test) and by the app,
 * so an unexpected model response is rejected instead of shown.
 */
export const foodScanSchema = z.object({
  status: z.enum(['ok', 'not_food', 'unclear']),
  mealTitle: z.string().max(80),
  items: z
    .array(
      z.object({
        name: z.string().min(1).max(60),
        estimatedGrams: z.number().min(0).max(2000),
        kcal: z.number().min(0).max(5000),
        protein: z.number().min(0).max(300),
        carbs: z.number().min(0).max(500),
        fat: z.number().min(0).max(300),
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
