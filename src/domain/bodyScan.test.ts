import { bodyScanFor, bodyScanState, fullnessFor } from './bodyScan';
import { emptyAppData, type Profile } from './types';

describe('weight-driven body scan', () => {
  const s = (startKg: number | null, goalKg: number | null, currentKg: number | null, heightCm: number | null = null) => bodyScanState({ startKg, goalKg, currentKg, heightCm });

  it('places the current weight between start (fuller) and goal (slimmer) shape', () => {
    expect(s(100, 80, 100)).toEqual({ fullness: 1, basis: 'progress' });
    expect(s(100, 80, 90)).toEqual({ fullness: 0.5, basis: 'progress' });
    expect(s(100, 80, 80).fullness).toBe(0);
    expect(s(100, 80, 76).fullness).toBe(0); // below goal: stays the goal shape
    expect(s(100, 80, 104).fullness).toBe(1); // above start: stays the start shape
  });

  it('reacts visibly to weight loss and gain', () => {
    const before = s(100, 80, 95).fullness;
    expect(s(100, 80, 93).fullness).toBeLessThan(before);
    expect(s(100, 80, 97).fullness).toBeGreaterThan(before);
  });

  it('smooths small daily fluctuations (steps of 0.05)', () => {
    expect(s(100, 80, 90.1).fullness).toBe(s(100, 80, 90.3).fullness);
  });

  it('falls back to height and weight when no weight-loss goal exists', () => {
    expect(s(70, 75, 70, 175).basis).toBe('bmi'); // gain goal
    expect(s(null, null, 70, 175)).toMatchObject({ basis: 'bmi' });
    expect(s(null, null, 120, 175).fullness).toBe(1);
    expect(s(null, null, 60, 180).fullness).toBe(0);
  });

  it('shows the start shape without data', () => {
    expect(s(null, null, null)).toEqual({ fullness: 1, basis: 'none' });
    expect(s(null, 80, 90)).toEqual({ fullness: 1, basis: 'none' });
  });

  it('start and goal views are fixed, current follows the data', () => {
    const st = s(100, 80, 90);
    expect([fullnessFor('start', st), fullnessFor('current', st), fullnessFor('goal', st)]).toEqual([1, 0.5, 0]);
  });

  it('reads the app data (profile start/goal + latest weight entry)', () => {
    const profile = {
      name: 'A',
      adultConfirmed: true,
      units: 'metric',
      goals: ['weight'],
      startWeightKg: 100,
      goalWeightKg: 80,
      activityPrefs: [],
      food: { preferred: [], restrictions: [], allergies: [], dislikes: [] },
      planningTime: '20:00',
      createdAt: 'x',
      onboardingCompletedAt: 'x',
    } as Profile;
    const data = { ...emptyAppData(), profile, weights: [{ id: 'w', date: '2026-11-27', kg: 85, createdAt: 'x', updatedAt: 'x' }] };
    expect(bodyScanFor(data)).toEqual({ fullness: 0.25, basis: 'progress' });
  });
});
