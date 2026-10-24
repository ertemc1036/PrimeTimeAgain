import type { ActionTemplate, AreaId, GoalTemplate, GoalTemplateId } from './types';

/**
 * Action library. Small, realistic actions with honest time estimates. Text lives in i18n under
 * `actions.<id>`. Nothing here gives medical, diet or financial advice; actions are habits to practise.
 * Icons are Ionicons names.
 */
export const ACTIONS: readonly ActionTemplate[] = [
  // Body
  { id: 'walk_10', minutes: 10, difficulty: 1, icon: 'walk' },
  { id: 'walk_20', minutes: 20, difficulty: 1, icon: 'walk' },
  { id: 'workout_20', minutes: 20, difficulty: 2, icon: 'barbell' },
  { id: 'workout_30', minutes: 30, difficulty: 3, icon: 'barbell' },
  { id: 'strength_15', minutes: 15, difficulty: 2, icon: 'barbell' },
  { id: 'strength_30', minutes: 30, difficulty: 3, icon: 'barbell' },
  { id: 'cardio_15', minutes: 15, difficulty: 2, icon: 'pulse' },
  { id: 'mobility_10', minutes: 10, difficulty: 1, icon: 'body' },
  { id: 'stretch_5', minutes: 5, difficulty: 1, icon: 'body' },
  { id: 'plan_meal', minutes: 10, difficulty: 1, icon: 'restaurant' },
  { id: 'review_eating', minutes: 5, difficulty: 1, icon: 'create' },
  { id: 'protein_meal', minutes: 15, difficulty: 1, icon: 'restaurant' },
  { id: 'water', minutes: 2, difficulty: 1, icon: 'water' },
  { id: 'morning_light', minutes: 10, difficulty: 1, icon: 'sunny' },
  // Mind
  { id: 'confidence_win', minutes: 5, difficulty: 1, icon: 'trophy' },
  { id: 'posture_check', minutes: 5, difficulty: 1, icon: 'accessibility' },
  { id: 'social_challenge', minutes: 15, difficulty: 2, icon: 'flash' },
  { id: 'practice_speaking', minutes: 10, difficulty: 2, icon: 'mic' },
  { id: 'hard_thing_first', minutes: 20, difficulty: 2, icon: 'flame' },
  { id: 'plan_day', minutes: 5, difficulty: 1, icon: 'list' },
  { id: 'cold_finish', minutes: 3, difficulty: 2, icon: 'snow' },
  { id: 'deep_work_25', minutes: 25, difficulty: 2, icon: 'locate' },
  { id: 'deep_work_50', minutes: 50, difficulty: 3, icon: 'locate' },
  { id: 'breathing_5', minutes: 5, difficulty: 1, icon: 'leaf' },
  { id: 'read_15', minutes: 15, difficulty: 1, icon: 'book' },
  { id: 'reflect_5', minutes: 5, difficulty: 1, icon: 'journal' },
  // Money
  { id: 'skill_15', minutes: 15, difficulty: 1, icon: 'school' },
  { id: 'skill_30', minutes: 30, difficulty: 2, icon: 'school' },
  { id: 'business_idea_30', minutes: 30, difficulty: 2, icon: 'bulb' },
  { id: 'business_task_45', minutes: 45, difficulty: 3, icon: 'briefcase' },
  { id: 'career_task', minutes: 20, difficulty: 2, icon: 'trending-up' },
  { id: 'review_finances', minutes: 10, difficulty: 1, icon: 'wallet' },
  { id: 'network_reach', minutes: 10, difficulty: 2, icon: 'people' },
  { id: 'portfolio_update', minutes: 20, difficulty: 2, icon: 'folder-open' },
  { id: 'income_research', minutes: 15, difficulty: 1, icon: 'search' },
  // Social
  { id: 'message_friend', minutes: 5, difficulty: 1, icon: 'chatbubble' },
  { id: 'call_someone', minutes: 15, difficulty: 1, icon: 'call' },
  { id: 'plan_meetup', minutes: 10, difficulty: 1, icon: 'calendar' },
  { id: 'join_event', minutes: 60, difficulty: 3, icon: 'people-circle' },
  { id: 'active_listening', minutes: 10, difficulty: 1, icon: 'ear' },
  { id: 'conversation_starter', minutes: 10, difficulty: 2, icon: 'chatbubbles' },
  // Lifestyle
  { id: 'wind_down', minutes: 15, difficulty: 1, icon: 'moon' },
  { id: 'bed_on_time', minutes: 5, difficulty: 1, icon: 'bed' },
  { id: 'screen_limit', minutes: 5, difficulty: 1, icon: 'phone-portrait' },
  { id: 'morning_routine', minutes: 15, difficulty: 1, icon: 'sunny' },
  { id: 'tidy_space', minutes: 10, difficulty: 1, icon: 'home' },
  { id: 'me_time', minutes: 20, difficulty: 1, icon: 'cafe' },
  { id: 'hobby', minutes: 30, difficulty: 1, icon: 'color-palette' },
  { id: 'outdoors', minutes: 20, difficulty: 1, icon: 'leaf' },
  { id: 'plan_week', minutes: 15, difficulty: 1, icon: 'calendar' },
  // Presence & style
  { id: 'skincare', minutes: 5, difficulty: 1, icon: 'water' },
  { id: 'grooming', minutes: 10, difficulty: 1, icon: 'cut' },
  { id: 'outfit_plan', minutes: 10, difficulty: 1, icon: 'shirt' },
  { id: 'wardrobe_review', minutes: 20, difficulty: 1, icon: 'shirt' },
  { id: 'style_inspiration', minutes: 15, difficulty: 1, icon: 'images' },
  { id: 'body_language', minutes: 10, difficulty: 2, icon: 'accessibility' },
  { id: 'voice_practice', minutes: 10, difficulty: 2, icon: 'mic' },
  { id: 'composure_breath', minutes: 5, difficulty: 1, icon: 'leaf' },
];

/** Actions offered for goals the user creates themselves; titles include the goal name. */
export const CUSTOM_ACTIONS: readonly ActionTemplate[] = [
  { id: 'custom_work', minutes: 20, difficulty: 2, icon: 'hammer' },
  { id: 'custom_plan', minutes: 10, difficulty: 1, icon: 'list' },
  { id: 'custom_review', minutes: 5, difficulty: 1, icon: 'checkmark-done' },
];

export const GOAL_TEMPLATES: readonly GoalTemplate[] = [
  { id: 'lose_weight', area: 'body', icon: 'scale', actions: ['walk_20', 'workout_20', 'plan_meal', 'review_eating', 'wind_down'] },
  { id: 'get_fit', area: 'body', icon: 'fitness', actions: ['workout_20', 'cardio_15', 'walk_20', 'mobility_10', 'strength_15'] },
  { id: 'build_muscle', area: 'body', icon: 'barbell', actions: ['strength_30', 'strength_15', 'protein_meal', 'mobility_10', 'bed_on_time'] },
  { id: 'look_better', area: 'presence', icon: 'sparkles', actions: ['skincare', 'grooming', 'posture_check', 'outfit_plan', 'workout_20'] },
  { id: 'confidence', area: 'mind', icon: 'shield-checkmark', actions: ['confidence_win', 'social_challenge', 'posture_check', 'practice_speaking', 'hard_thing_first'] },
  { id: 'discipline', area: 'mind', icon: 'flame', actions: ['hard_thing_first', 'plan_day', 'cold_finish', 'deep_work_25', 'bed_on_time'] },
  { id: 'focus', area: 'mind', icon: 'locate', actions: ['deep_work_25', 'deep_work_50', 'screen_limit', 'breathing_5', 'read_15'] },
  { id: 'energy', area: 'body', icon: 'flash', actions: ['morning_light', 'walk_10', 'water', 'stretch_5', 'bed_on_time'] },
  { id: 'sleep', area: 'lifestyle', icon: 'moon', actions: ['wind_down', 'bed_on_time', 'screen_limit', 'morning_light', 'breathing_5'] },
  { id: 'habits', area: 'lifestyle', icon: 'repeat', actions: ['morning_routine', 'plan_day', 'tidy_space', 'reflect_5', 'plan_week'] },
  { id: 'make_money', area: 'money', icon: 'cash', actions: ['skill_30', 'income_research', 'review_finances', 'business_idea_30', 'network_reach'] },
  { id: 'career', area: 'money', icon: 'trending-up', actions: ['career_task', 'skill_15', 'network_reach', 'portfolio_update', 'deep_work_50'] },
  { id: 'business', area: 'money', icon: 'rocket', actions: ['business_idea_30', 'business_task_45', 'income_research', 'network_reach', 'skill_15'] },
  { id: 'social_life', area: 'social', icon: 'people', actions: ['message_friend', 'call_someone', 'plan_meetup', 'join_event', 'social_challenge'] },
  { id: 'communication', area: 'social', icon: 'chatbubbles', actions: ['active_listening', 'conversation_starter', 'practice_speaking', 'voice_practice', 'reflect_5'] },
  { id: 'style', area: 'presence', icon: 'shirt', actions: ['outfit_plan', 'wardrobe_review', 'style_inspiration', 'grooming', 'skincare'] },
  { id: 'presence', area: 'presence', icon: 'star', actions: ['body_language', 'voice_practice', 'composure_breath', 'posture_check', 'social_challenge'] },
  { id: 'me_time', area: 'lifestyle', icon: 'cafe', actions: ['me_time', 'hobby', 'outdoors', 'screen_limit', 'breathing_5'] },
  { id: 'lifestyle', area: 'lifestyle', icon: 'sunny', actions: ['morning_routine', 'outdoors', 'plan_week', 'tidy_space', 'hobby'] },
];

export const AREA_ICONS: Record<AreaId, string> = {
  body: 'barbell',
  mind: 'bulb',
  money: 'stats-chart',
  social: 'people',
  lifestyle: 'sunny',
  presence: 'sparkles',
};

const actionsById = new Map([...ACTIONS, ...CUSTOM_ACTIONS].map((a) => [a.id, a]));
const goalsById = new Map(GOAL_TEMPLATES.map((g) => [g.id, g]));

export const getActionTemplate = (id: string | undefined) => (id ? actionsById.get(id) : undefined);
export const getGoalTemplate = (id: GoalTemplateId | null | undefined) => (id ? goalsById.get(id) : undefined);

export const MAX_GOALS = 8;
export const MAX_ACTIONS_PER_GOAL = 10;
