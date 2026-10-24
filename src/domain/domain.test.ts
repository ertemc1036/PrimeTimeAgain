import en from '@/i18n/locales/en.json';

import { GOALS, suggestedGoals } from './catalog';
import { addDays, daysBetween, lastNDays, toISODate } from './dates';
import { activeDays, currentPhase, isJourneyComplete, journeyDay, nextMilestone, phaseStatus, PHASES, weekOfDay } from './journey';
import { computePrimeScore, dailyCompletion, scoreLevel } from './primeScore';

const TODAY = '2026-10-24';

describe('dates', () => {
  it('formats local dates', () => {
    expect(toISODate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
  it('adds days across month and DST boundaries', () => {
    expect(addDays('2026-10-24', 10)).toBe('2026-11-03');
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30');
    expect(daysBetween('2026-10-20', TODAY)).toBe(4);
  });
  it('lists the last n days oldest first', () => {
    expect(lastNDays(TODAY, 3)).toEqual(['2026-10-22', '2026-10-23', TODAY]);
  });
});

describe('computePrimeScore', () => {
  const goalIds = ['walk', 'breathe'];

  it('is null when nothing is planned', () => {
    expect(computePrimeScore({ goalIds: [], log: {}, startDate: TODAY, today: TODAY }).score).toBeNull();
  });

  it('divides completed by planned check-ins over 7 days', () => {
    const log = { [TODAY]: ['walk', 'breathe'], '2026-10-23': ['walk'] };
    const s = computePrimeScore({ goalIds, log, startDate: '2026-01-01', today: TODAY });
    expect(s.planned).toBe(14);
    expect(s.completed).toBe(3);
    expect(s.score).toBe(21);
    expect(s.byPillar.body).toMatchObject({ planned: 7, completed: 2, score: 29 });
    expect(s.byPillar.mind).toMatchObject({ planned: 7, completed: 1, score: 14 });
    expect(s.byPillar.life.score).toBeNull();
  });

  it('never counts days before the start date against the user', () => {
    const s = computePrimeScore({ goalIds, log: { [TODAY]: ['walk', 'breathe'] }, startDate: TODAY, today: TODAY });
    expect(s.planned).toBe(2);
    expect(s.score).toBe(100);
  });

  it('ignores removed goals, unknown ids and duplicates', () => {
    const log = { [TODAY]: ['walk', 'walk', 'read', 'nope'] };
    const s = computePrimeScore({ goalIds, log, startDate: TODAY, today: TODAY });
    expect(s.completed).toBe(1);
  });

  it('ignores completions outside the window', () => {
    const s = computePrimeScore({ goalIds, log: { '2026-10-01': ['walk'] }, startDate: '2026-01-01', today: TODAY });
    expect(s.completed).toBe(0);
  });

  it('frames every level positively', () => {
    expect(scoreLevel(null)).toBe('beginning');
    expect(scoreLevel(10)).toBe('beginning');
    expect(scoreLevel(40)).toBe('rhythm');
    expect(scoreLevel(70)).toBe('momentum');
    expect(scoreLevel(95)).toBe('prime');
  });
});

describe('dailyCompletion', () => {
  it('computes per-day ratios', () => {
    const days = dailyCompletion(['walk', 'read'], { [TODAY]: ['walk'] }, ['2026-10-23', TODAY]);
    expect(days.map((d) => d.ratio)).toEqual([0, 0.5]);
  });
});

describe('journey', () => {
  it('counts the start date as day 1 and clamps at 90', () => {
    expect(journeyDay(TODAY, TODAY)).toBe(1);
    expect(journeyDay(addDays(TODAY, -18), TODAY)).toBe(19);
    expect(journeyDay(addDays(TODAY, -200), TODAY)).toBe(90);
    expect(journeyDay(addDays(TODAY, 3), TODAY)).toBe(1);
    expect(isJourneyComplete(addDays(TODAY, -90), TODAY)).toBe(true);
    expect(isJourneyComplete(addDays(TODAY, -89), TODAY)).toBe(false);
  });
  it('maps days to phases, weeks and milestones', () => {
    expect(currentPhase(1).id).toBe('reset');
    expect(currentPhase(31).id).toBe('rebuild');
    expect(currentPhase(90).id).toBe('rise');
    expect(phaseStatus(PHASES[0], 45)).toBe('done');
    expect(phaseStatus(PHASES[2], 45)).toBe('upcoming');
    expect(weekOfDay(7)).toBe(1);
    expect(weekOfDay(8)).toBe(2);
    expect(weekOfDay(90)).toBe(13);
    expect(nextMilestone(19)).toBe(30);
    expect(nextMilestone(90)).toBeNull();
  });
  it('counts active days since the start only', () => {
    const log = { [TODAY]: ['walk'], '2026-10-23': [], '2026-09-01': ['walk'] };
    expect(activeDays(log, '2026-10-01', TODAY)).toBe(1);
  });
});

describe('catalog', () => {
  it('has translated text for every goal', () => {
    const goals = en.goals as Record<string, { title: string; task: string }>;
    for (const g of GOALS) {
      expect(goals[g.id]?.title).toBeTruthy();
      expect(goals[g.id]?.task).toBeTruthy();
    }
  });
  it('suggests more goals when more time is available', () => {
    expect(suggestedGoals(['body', 'mind'], 10)).toHaveLength(2);
    expect(suggestedGoals(['body', 'mind'], 30)).toHaveLength(4);
  });
});
