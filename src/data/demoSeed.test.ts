import { computePrimeScore } from '@/domain/primeScore';

import { buildDemoData, DEMO_DAY } from './demoSeed';

it('builds realistic, deterministic sample data', () => {
  const input = {
    profile: { name: 'Sam', dailyMinutes: 20 as const, focusPillars: ['body' as const], createdAt: '' },
    goalIds: ['walk', 'breathe', 'plan'],
    today: '2026-10-24',
    reflectionTexts: ['a', 'b'],
  };
  const a = buildDemoData(input);
  expect(a).toEqual(buildDemoData(input));
  expect(a.profile?.startDate).toBe('2026-10-06');
  expect(Object.keys(a.log)).toHaveLength(DEMO_DAY);
  expect(a.log['2026-10-24']).toEqual(['walk']);
  expect(a.reflections).toHaveLength(2);
  const score = computePrimeScore({ goalIds: a.goalIds, log: a.log, startDate: a.profile!.startDate, today: input.today });
  expect(score.score).toBeGreaterThan(40);
  expect(score.score).toBeLessThan(95);
});
