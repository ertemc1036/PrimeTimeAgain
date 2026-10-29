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
