import { applyMutation } from '@/domain/mutations';
import { emptyAppData, type Profile } from '@/domain/types';
import { parseSse } from '@/services/ai/client';

import { coachContext } from './coachContext';

const profile: Profile = {
  name: 'Sam', adultConfirmed: true, units: 'metric', goals: ['habits'], activityPrefs: ['gym'], startWeightKg: 90,
  food: { preferred: ['Fish'], restrictions: [], allergies: ['Peanuts'], dislikes: [] }, planningTime: '20:30',
  createdAt: '2026-10-20T08:00:00.000Z', onboardingCompletedAt: '2026-10-20T08:00:00.000Z',
};

describe('coach context', () => {
  const base = applyMutation(emptyAppData(), { type: 'completeOnboarding', profile, journey: { programEnabled: true, startDate: '2026-10-20', maintenance: false }, notifications: emptyAppData().notifications }, '2026-10-26');
  it('is not shared without consent', () => {
    expect(coachContext(base, '2026-10-26')).toBeNull();
  });
  it('summarises goals, plans, logs, rest days, streak and journey — without weight', () => {
    let d = applyMutation(base, { type: 'setCoachConsent', value: true }, '2026-10-26');
    d = applyMutation(d, { type: 'saveRestDay', date: '2026-10-25', at: 'x' }, '2026-10-26');
    d = applyMutation(d, { type: 'upsertActivity', log: { id: 'a', date: '2026-10-26', type: 'gym', startTime: '07:00', durationMin: 30, description: 'Legs', entryMethod: 'manual', createdAt: 'x', updatedAt: 'x' } }, '2026-10-26');
    const ctx = coachContext(d, '2026-10-26')!;
    expect(ctx.goals).toEqual(['habits']);
    expect((ctx.food as { allergies: string[] }).allergies).toEqual(['Peanuts']);
    expect(ctx.recentRestDays).toEqual(['2026-10-25']);
    expect(ctx.recentWorkouts).toEqual([{ date: '2026-10-26', type: 'gym', minutes: 30 }]);
    expect(ctx.journey).toMatchObject({ month: 1, theme: 'foundation' });
    expect(JSON.stringify(ctx)).not.toContain('90');
  });
});

describe('coach stream parsing', () => {
  it('handles events split across network chunks', () => {
    const a = parseSse('data: {"t":"d","v":"Hel"}\n\ndata: {"t":"d","v"');
    expect(a.events).toEqual([{ t: 'd', v: 'Hel' }]);
    const b = parseSse(a.rest + ':"lo"}\n\ndata: {"t":"end"}\n\n');
    expect(b.events).toEqual([{ t: 'd', v: 'lo' }, { t: 'end' }]);
    expect(b.rest).toBe('');
  });
});
