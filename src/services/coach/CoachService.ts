import { coachTips, coachToday, type CoachMessage, type CoachTip } from '@/domain/coach';
import type { AppData, ISODate } from '@/domain/types';

/**
 * Coaching boundary.
 *
 * Today: `localCoachService` returns deterministic guidance computed on the device from the plan.
 *
 * Planned (needs approval): `remoteCoachService` calls a Supabase Edge Function
 * (`/functions/v1/coach`) with the user's session token. The function holds the Claude API key,
 * builds a context from goals, phase, mission history and available time (plus reflections only if
 * `preferences.coachUsesReflections` is true), enforces rate limits and Prime Pro entitlement,
 * applies the safety policy (no medical diagnosis, no extreme dieting or training, no guaranteed
 * financial outcomes) and answers in the user's app language. No API key ever ships in the app.
 */
export interface CoachGuidance {
  today: CoachMessage;
  tips: CoachTip[];
}

export interface CoachService {
  getGuidance(input: { data: AppData; today: ISODate; language: string }): Promise<CoachGuidance>;
}

export const localCoachService: CoachService = {
  async getGuidance({ data, today }) {
    return { today: coachToday(data, today), tips: coachTips(data, today) };
  },
};
