import type { ISODate } from '@/domain/types';
import { daysBetween } from '@/domain/dates';

/**
 * Coaching boundary. Today it returns curated, translated tips from the app.
 * Later, a remote implementation will call a Supabase Edge Function that talks to
 * the Claude API. The API key stays on the server and never ships in the app.
 */
export type CoachMessage =
  | { kind: 'tip'; key: `coach.tips.${TipId}` }
  | { kind: 'text'; text: string };

const TIP_IDS = ['t1', 't2', 't3', 't4', 't5', 't6', 't7'] as const;
type TipId = (typeof TIP_IDS)[number];

export interface CoachService {
  getDailyMessage(input: { date: ISODate; language: string }): Promise<CoachMessage>;
}

export const localCoachService: CoachService = {
  async getDailyMessage({ date }) {
    const index = Math.abs(daysBetween('2024-01-01', date)) % TIP_IDS.length;
    return { kind: 'tip', key: `coach.tips.${TIP_IDS[index]}` };
  },
};
