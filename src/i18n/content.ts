import type { TFunction } from 'i18next';

import type { GoalAction, GoalTemplateId, Mission, UserGoal } from '@/domain/types';

/**
 * Catalogue text is looked up by id; user-written goals and actions keep the user's own words.
 * Keys are built from catalogue ids, and the translation tests guarantee every id has text.
 */
type T = TFunction;

export const goalTemplateTitle = (t: T, id: GoalTemplateId | 'custom') => t(`goals.${id}.title` as 'goals.get_fit.title');

export const goalTitle = (t: T, goal: Pick<UserGoal, 'templateId' | 'title'>) =>
  goal.templateId ? goalTemplateTitle(t, goal.templateId) : (goal.title ?? '');

export const goalOutcome = (t: T, goal: UserGoal) =>
  goal.desiredOutcome || t(`goals.${goal.templateId ?? 'custom'}.outcome` as 'goals.get_fit.outcome');

const templateActionTitle = (t: T, templateId: string, goalName: string) =>
  t(`actions.${templateId}` as 'actions.walk_10', { goal: goalName });

export const actionTitle = (t: T, action: GoalAction, goal: UserGoal) =>
  action.title ?? (action.templateId ? templateActionTitle(t, action.templateId, goalTitle(t, goal)) : '');

export const missionTitle = (t: T, mission: Mission, goal: UserGoal | undefined) =>
  mission.title ??
  (mission.actionTemplateId ? templateActionTitle(t, mission.actionTemplateId, goal ? goalTitle(t, goal) : '') : '');
