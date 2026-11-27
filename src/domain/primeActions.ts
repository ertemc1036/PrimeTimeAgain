import type { PrimeAction } from './aiSchemas';
import { addDays } from './dates';
import type { Mutation } from './mutations';
import type { FoodItem, ISODate, PrimeRecordRef } from './types';

export type { PrimeAction } from './aiSchemas';

/**
 * What confirming a Prime action changes. Every action only creates new records, so undoing it
 * means deleting exactly those records (see undoMutations). All changes of one action are applied
 * as one batch: either everything is saved or nothing.
 */
export interface ActionContext {
  today: ISODate;
  /** Local wall time now, HH:MM. */
  nowTime: string;
  nowISO: string;
  newId(prefix: string): string;
  /** Absolute timestamp for a local date + time. */
  at(date: ISODate, time: string): string;
}

export function actionDate(a: PrimeAction, today: ISODate): ISODate | null {
  return 'day' in a ? (a.day === 'yesterday' ? addDays(today, -1) : today) : null;
}

const DEFAULT_TIME: Record<'breakfast' | 'lunch' | 'dinner' | 'snack', string> = { breakfast: '08:00', lunch: '12:30', dinner: '19:00', snack: '16:00' };

/** Items as stored in the food log; nutrition only when all four values were estimated. */
export function toFoodItems(items: Extract<PrimeAction, { type: 'log_meal' }>['items'], newId: (p: string) => string): FoodItem[] {
  return items.map((i) => ({
    id: newId('item'),
    name: i.name,
    quantity: i.quantity,
    unit: i.unit,
    grams: i.grams ?? undefined,
    nutrition:
      i.kcal !== null && i.protein !== null && i.carbs !== null && i.fat !== null
        ? { kcal: Math.round(i.kcal), protein: Math.round(i.protein * 10) / 10, carbs: Math.round(i.carbs * 10) / 10, fat: Math.round(i.fat * 10) / 10 }
        : null,
  }));
}

export function planAction(a: PrimeAction, ctx: ActionContext, fallbackDescription: string): { mutations: Mutation[]; created: PrimeRecordRef[] } {
  const date = actionDate(a, ctx.today) ?? ctx.today;
  const sameDayTime = (t: string | null, fallback: string) => t ?? (date === ctx.today ? ctx.nowTime : fallback);
  switch (a.type) {
    case 'log_water': {
      const id = ctx.newId('water');
      return {
        mutations: [{ type: 'addWater', log: { id, date, ml: a.ml, at: date === ctx.today ? ctx.nowISO : ctx.at(date, '12:00'), source: 'prime', createdAt: ctx.nowISO } }],
        created: [{ kind: 'water', id }],
      };
    }
    case 'log_meal': {
      const id = ctx.newId('food');
      const time = a.time ?? (date === ctx.today ? ctx.nowTime : DEFAULT_TIME[a.mealType]);
      return {
        mutations: [
          {
            type: 'upsertFood',
            log: {
              id,
              date,
              consumedAt: ctx.at(date, time),
              time,
              mealType: a.mealType,
              title: a.title,
              items: toFoodItems(a.items, ctx.newId),
              entryMethod: 'ai',
              aiEstimated: true,
              createdAt: ctx.nowISO,
              updatedAt: ctx.nowISO,
            },
          },
        ],
        created: [{ kind: 'food', id }],
      };
    }
    case 'log_workout': {
      const id = ctx.newId('act');
      return {
        mutations: [
          {
            type: 'upsertActivity',
            log: {
              id,
              date,
              type: a.workoutType,
              startTime: sameDayTime(a.time, '18:00'),
              durationMin: a.durationMin,
              description: a.description || fallbackDescription,
              entryMethod: 'manual',
              createdAt: ctx.nowISO,
              updatedAt: ctx.nowISO,
            },
          },
        ],
        created: [{ kind: 'activity', id }],
      };
    }
    case 'log_rest_day':
      return { mutations: [{ type: 'saveRestDay', date, at: ctx.nowISO }], created: [{ kind: 'rest', id: date }] };
    case 'log_weight': {
      const id = ctx.newId('w');
      return { mutations: [{ type: 'upsertWeight', entry: { id, date, kg: a.kg, createdAt: ctx.nowISO, updatedAt: ctx.nowISO } }], created: [{ kind: 'weight', id }] };
    }
    case 'remember': {
      const id = ctx.newId('mem');
      return { mutations: [{ type: 'upsertMemory', memory: { id, category: a.category, text: a.text, createdAt: ctx.nowISO, updatedAt: ctx.nowISO } }], created: [{ kind: 'memory', id }] };
    }
  }
}

/** Deletes exactly what an action created (records already removed by the user are skipped). */
export function undoMutations(created: PrimeRecordRef[], exists: (ref: PrimeRecordRef) => boolean): Mutation[] {
  return created.filter(exists).map((r): Mutation => {
    switch (r.kind) {
      case 'food':
        return { type: 'deleteFood', id: r.id };
      case 'activity':
        return { type: 'deleteActivity', id: r.id };
      case 'water':
        return { type: 'deleteWater', id: r.id };
      case 'weight':
        return { type: 'deleteWeight', id: r.id };
      case 'memory':
        return { type: 'deleteMemory', id: r.id };
      case 'rest':
        return { type: 'removeRestDay', date: r.id };
    }
  });
}
