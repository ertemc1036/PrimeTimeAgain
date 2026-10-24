import type { AvatarConfig } from '@/avatar/types';

import { getGoalTemplate } from './catalog';
import { templateActions } from './missions';
import { clampDuration, clampMinutes } from './program';
import {
  defaultPreferences,
  type AppData,
  type AreaId,
  type ComebackProfile,
  type GoalTemplateId,
  type ISODate,
  type UserGoal,
} from './types';

export interface CustomGoalDraft {
  id: string;
  title: string;
  area: AreaId;
}

/** Everything collected during onboarding. Nothing is saved until the user finishes. */
export interface OnboardingDraft {
  goalIds: GoalTemplateId[];
  customGoals: CustomGoalDraft[];
  profile: Omit<ComebackProfile, 'createdAt'>;
  durationDays: number;
  dailyMinutes: number;
  avatar: AvatarConfig | null;
}

export const newId = (prefix = 'id') => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export function goalFromTemplate(templateId: GoalTemplateId, createdAt: string, id = `g_${templateId}`): UserGoal {
  const template = getGoalTemplate(templateId)!;
  return {
    id,
    templateId,
    area: template.area,
    startingPoint: '',
    desiredOutcome: '',
    actions: templateActions(templateId),
    createdAt,
    archived: false,
  };
}

export function customGoal(draft: CustomGoalDraft, createdAt: string): UserGoal {
  return {
    id: draft.id,
    templateId: null,
    title: draft.title.trim(),
    area: draft.area,
    startingPoint: '',
    desiredOutcome: '',
    actions: templateActions(null),
    createdAt,
    archived: false,
  };
}

/** Build the initial plan from onboarding answers. The program starts today. */
export function buildPlan(draft: OnboardingDraft, today: ISODate, now = new Date().toISOString()): AppData {
  return {
    version: 2,
    profile: { ...draft.profile, name: draft.profile.name.trim(), createdAt: now },
    program: { startDate: today, durationDays: clampDuration(draft.durationDays), dailyMinutes: clampMinutes(draft.dailyMinutes) },
    goals: [
      ...draft.goalIds.map((id) => goalFromTemplate(id, now)),
      ...draft.customGoals.filter((g) => g.title.trim()).map((g) => customGoal(g, now)),
    ],
    days: {},
    reflections: [],
    measurements: [],
    photos: [],
    avatar: draft.avatar,
    preferences: defaultPreferences(),
  };
}
