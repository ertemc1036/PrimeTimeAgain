import { normalizePrimeActions, primeActionRawSchema, primeReplySchema, type PrimeAction } from '@/domain/aiSchemas';
import { applyMutation, MutationRejected, type Mutation } from '@/domain/mutations';
import { planAction, undoMutations } from '@/domain/primeActions';
import { emptyAppData, type AppData, type CoachMessage, type PrimeRecordRef } from '@/domain/types';
import { allChanges, applyRecords, diffRecords } from '@/sync/records';

const TODAY = '2026-11-27';
let n = 0;
const ctx = { today: TODAY, nowTime: '13:05', nowISO: '2026-11-27T12:05:00.000Z', newId: (p: string) => `${p}_${++n}`, at: (d: string, t: string) => `${d}T${t}:00.000Z` };
const raw = (over: Partial<ReturnType<typeof primeActionRawSchema.parse>>) =>
  primeActionRawSchema.parse({ type: 'log_water', day: null, ml: null, mealType: null, title: null, time: null, items: null, workoutType: null, durationMin: null, description: null, kg: null, category: null, text: null, ...over });
const run = (d: AppData, m: Mutation) => applyMutation(d, m, TODAY);

describe('Prime action validation', () => {
  it('keeps complete actions and drops incomplete ones', () => {
    const actions = normalizePrimeActions(
      [
        raw({ type: 'log_water', ml: 500 }),
        raw({ type: 'log_water' }), // no amount → dropped, never guessed
        raw({ type: 'log_meal', mealType: 'breakfast', title: 'Eggs and bread', items: [{ name: 'Egg', quantity: 2, unit: 'pcs', grams: 100, kcal: 155, protein: 13, carbs: 1, fat: 11 }] }),
        raw({ type: 'log_meal', mealType: 'lunch', title: 'Nothing', items: [] }), // no items → dropped
        raw({ type: 'log_workout', workoutType: 'gym', durationMin: 45, day: 'yesterday' }),
        raw({ type: 'log_weight', kg: 82.46 }),
        raw({ type: 'remember', category: 'routine', text: 'Works night shifts' }),
      ],
      true,
    );
    expect(actions.map((a) => a.type)).toEqual(['log_water', 'log_meal', 'log_workout', 'log_weight', 'remember']);
    expect(actions[2]).toMatchObject({ day: 'yesterday', durationMin: 45 });
    expect(actions[3]).toMatchObject({ kg: 82.5 });
  });

  it('drops "remember" without PrimeMe+', () => {
    expect(normalizePrimeActions([raw({ type: 'remember', category: 'goal', text: 'Run 5 km' })], false)).toEqual([]);
  });

  it('rejects out-of-range values and more than five actions', () => {
    expect(primeActionRawSchema.safeParse({ ...raw({}), ml: 9000 }).success).toBe(false);
    expect(primeActionRawSchema.safeParse({ ...raw({}), kg: 10 }).success).toBe(false);
    expect(primeActionRawSchema.safeParse({ ...raw({}), time: '25:00' }).success).toBe(false);
    expect(primeReplySchema.safeParse({ reply: 'ok', actions: Array.from({ length: 6 }, () => raw({ ml: 250 })) }).success).toBe(false);
  });
});

describe('Applying and undoing Prime actions', () => {
  const message = (actions: PrimeAction[]): CoachMessage => ({ id: 'm1', role: 'assistant', content: 'Logged?', createdAt: ctx.nowISO, actions: actions.map((a) => ({ ...a, status: 'pending' as const })) });
  const apply = (d: AppData, a: PrimeAction, index = 0) => {
    const { mutations, created } = planAction(a, ctx, 'Logged with Prime');
    const logId = ctx.newId('pa');
    return {
      logId,
      created,
      data: run(d, { type: 'batch', mutations: [...mutations, { type: 'addPrimeAction', log: { id: logId, summary: a.type, created, appliedAt: ctx.nowISO } }, { type: 'setMessageAction', messageId: 'm1', index, state: { status: 'applied', logId } }] }),
    };
  };
  const exists = (d: AppData) => (r: PrimeRecordRef) =>
    r.kind === 'water' ? d.water.some((x) => x.id === r.id) : r.kind === 'food' ? d.foodLogs.some((x) => x.id === r.id) : r.kind === 'activity' ? d.activityLogs.some((x) => x.id === r.id) : r.kind === 'memory' ? d.memories.some((x) => x.id === r.id) : r.kind === 'weight' ? d.weights.some((x) => x.id === r.id) : !!d.recoveryLogs[r.id];

  const water: PrimeAction = { type: 'log_water', day: 'today', ml: 500 };
  const meal: PrimeAction = { type: 'log_meal', day: 'today', mealType: 'breakfast', title: 'Eggs and bread', time: null, items: [{ name: 'Egg', quantity: 2, unit: 'pcs', grams: 100, kcal: 155, protein: 13, carbs: 1, fat: 11 }, { name: 'Bread', quantity: 1, unit: 'slice', grams: null, kcal: null, protein: null, carbs: null, fat: null }] };
  const workout: PrimeAction = { type: 'log_workout', day: 'yesterday', workoutType: 'gym', durationMin: 45, time: null, description: '' };

  it('saves exactly the confirmed records, marked as AI estimates, and logs the action', () => {
    let d = run(emptyAppData(), { type: 'addCoachMessage', message: message([water, meal, workout]) });
    const a = apply(d, water, 0);
    const b = apply(a.data, meal, 1);
    const c = apply(b.data, workout, 2);
    d = c.data;
    expect(d.water).toEqual([expect.objectContaining({ ml: 500, date: TODAY, source: 'prime' })]);
    expect(d.foodLogs[0]).toMatchObject({ title: 'Eggs and bread', aiEstimated: true, entryMethod: 'ai', mealType: 'breakfast', time: '13:05' });
    expect(d.foodLogs[0].items[1].nutrition).toBeNull(); // no estimate → stays unknown, not invented
    expect(d.activityLogs[0]).toMatchObject({ date: '2026-11-26', durationMin: 45, description: 'Logged with Prime' });
    expect(d.primeActions).toHaveLength(3);
    expect(d.coach.messages[0].actions!.map((x) => x.status)).toEqual(['applied', 'applied', 'applied']);
  });

  it('applies all changes of an action or none', () => {
    const d = run(emptyAppData(), { type: 'addCoachMessage', message: message([workout]) });
    const once = apply(d, workout).data;
    // The same workout again is a duplicate: the whole batch is rejected, nothing half-saved.
    expect(() => apply(once, workout)).toThrow(MutationRejected);
    const old: PrimeAction = { type: 'log_water', day: 'today', ml: 250 };
    const { mutations } = planAction(old, { ...ctx, today: '2026-11-20' }, 'x');
    expect(() => run(d, { type: 'batch', mutations: [...mutations, { type: 'addPrimeAction', log: { id: 'p', summary: 's', created: [], appliedAt: 'x' } }] })).toThrow(MutationRejected);
  });

  it('undo removes exactly the created records and keeps everything else', () => {
    let d = run(emptyAppData(), { type: 'addCoachMessage', message: message([meal]) });
    d = run(d, { type: 'addWater', log: { id: 'manual', date: TODAY, ml: 250, at: ctx.nowISO, source: 'manual', createdAt: ctx.nowISO } });
    const a = apply(d, meal);
    d = run(a.data, { type: 'batch', mutations: [...undoMutations(a.created, exists(a.data)), { type: 'markPrimeActionUndone', id: a.logId, at: 'later' }, { type: 'setMessageAction', messageId: 'm1', index: 0, state: { status: 'undone', logId: a.logId } }] });
    expect(d.foodLogs).toEqual([]);
    expect(d.water.map((w) => w.id)).toEqual(['manual']);
    expect(d.primeActions[0].undoneAt).toBe('later');
    expect(d.coach.messages[0].actions![0].status).toBe('undone');
  });

  it('undo skips records the user already deleted', () => {
    const d0 = run(emptyAppData(), { type: 'addCoachMessage', message: message([water]) });
    const a = apply(d0, water);
    const deleted = run(a.data, { type: 'deleteWater', id: a.created[0].id });
    expect(undoMutations(a.created, exists(deleted))).toEqual([]);
  });
});

describe('Sync of the new collections', () => {
  it('round-trips water, memory and the action log', () => {
    let d = emptyAppData();
    d = run(d, { type: 'addWater', log: { id: 'w1', date: TODAY, ml: 300, at: ctx.nowISO, source: 'manual', createdAt: ctx.nowISO } });
    d = run(d, { type: 'upsertMemory', memory: { id: 'm1', category: 'food', text: 'Loves lentil soup', createdAt: 'x', updatedAt: 'x' } });
    d = run(d, { type: 'addPrimeAction', log: { id: 'p1', summary: '300 ml', created: [{ kind: 'water', id: 'w1' }], appliedAt: 'x' } });
    const changes = allChanges(d, ctx.nowISO);
    expect(changes.map((c) => c.collection).sort()).toEqual(['memory', 'primeAction', 'settings', 'settings', 'settings', 'settings', 'water']);
    const restored = applyRecords(emptyAppData(), changes.map((c, i) => ({ ...c, seq: i + 1 })));
    expect(restored.water).toEqual(d.water);
    expect(restored.memories).toEqual(d.memories);
    expect(restored.primeActions).toEqual(d.primeActions);
    const deleted = diffRecords(d, run(d, { type: 'deleteAllMemories' }), 'y');
    expect(deleted).toEqual([expect.objectContaining({ collection: 'memory', id: 'm1', deleted: true })]);
  });
});
