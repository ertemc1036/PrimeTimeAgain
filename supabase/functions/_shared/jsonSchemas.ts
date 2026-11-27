/**
 * JSON Schemas for structured outputs (mirror schemas.ts; bounds are enforced afterwards by zod).
 * Written for strict mode: every object lists all properties as required, no extra properties.
 */
export const FOOD_SCAN_JSON = {
  type: 'object',
  additionalProperties: false,
  required: ['status', 'mealTitle', 'confidence', 'items', 'uncertaintyNotes'],
  properties: {
    status: { type: 'string', enum: ['ok', 'not_food', 'unclear'] },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    mealTitle: { type: 'string' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'estimatedGrams', 'kcal', 'protein', 'carbs', 'fat', 'confidence'],
        properties: {
          name: { type: 'string' },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
          estimatedGrams: { type: 'number' },
          kcal: { type: 'number' },
          protein: { type: 'number' },
          carbs: { type: 'number' },
          fat: { type: 'number' },
        },
      },
    },
    uncertaintyNotes: { type: 'array', items: { type: 'string' } },
  },
};

export const WORKOUT_PHOTO_JSON = {
  type: 'object',
  additionalProperties: false,
  required: ['environment', 'confidence', 'summary'],
  properties: {
    environment: { type: 'string', enum: ['gym', 'outdoor', 'home', 'unclear', 'other'] },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    summary: { type: 'string' },
  },
};

export const COACH_JSON = {
  type: 'object',
  additionalProperties: false,
  required: ['reply', 'safetyNotice'],
  properties: { reply: { type: 'string' }, safetyNotice: { type: 'boolean' } },
};

const nullable = (schema: Record<string, unknown>) => ({ anyOf: [schema, { type: 'null' }] });
const PRIME_ACTION_PROPS = {
  type: { type: 'string', enum: ['log_water', 'log_meal', 'log_workout', 'log_rest_day', 'log_weight', 'remember'] },
  day: nullable({ type: 'string', enum: ['today', 'yesterday'] }),
  ml: nullable({ type: 'integer' }),
  mealType: nullable({ type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack'] }),
  title: nullable({ type: 'string' }),
  time: nullable({ type: 'string' }),
  items: nullable({
    type: 'array',
    items: {
      type: 'object',
      additionalProperties: false,
      required: ['name', 'quantity', 'unit', 'grams', 'kcal', 'protein', 'carbs', 'fat'],
      properties: {
        name: { type: 'string' },
        quantity: { type: 'number' },
        unit: { type: 'string' },
        grams: nullable({ type: 'number' }),
        kcal: nullable({ type: 'number' }),
        protein: nullable({ type: 'number' }),
        carbs: nullable({ type: 'number' }),
        fat: nullable({ type: 'number' }),
      },
    },
  }),
  workoutType: nullable({ type: 'string', enum: ['gym', 'outdoor_walk', 'outdoor_run', 'home'] }),
  durationMin: nullable({ type: 'integer' }),
  description: nullable({ type: 'string' }),
  kg: nullable({ type: 'number' }),
  category: nullable({ type: 'string', enum: ['goal', 'food', 'routine', 'training', 'progress', 'challenge', 'motivation', 'other'] }),
  text: nullable({ type: 'string' }),
};

/** Prime: a reply plus suggested actions (validated afterwards by primeReplySchema). */
export const PRIME_JSON = {
  type: 'object',
  additionalProperties: false,
  required: ['reply', 'actions'],
  properties: {
    reply: { type: 'string' },
    actions: {
      type: 'array',
      items: { type: 'object', additionalProperties: false, required: Object.keys(PRIME_ACTION_PROPS), properties: PRIME_ACTION_PROPS },
    },
  },
};
