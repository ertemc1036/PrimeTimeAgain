import fs from 'fs';
import path from 'path';

import { applyMutation } from '@/domain/mutations';
import { emptyAppData, type AppData, type Profile } from '@/domain/types';
import { THIRD_PARTY_NOTICES } from '@/config/licenses';
import { applyRecords, diffRecords } from '@/sync/records';

const root = path.join(__dirname, '../..');
const profile: Profile = {
  name: 'Alex',
  adultConfirmed: true,
  units: 'metric',
  goals: ['weight'],
  startWeightKg: 92,
  goalWeightKg: 82,
  activityPrefs: [],
  food: { preferred: [], restrictions: [], allergies: [], dislikes: [] },
  planningTime: '20:00',
  createdAt: '2026-10-01T10:00:00.000Z',
  onboardingCompletedAt: '2026-10-01T10:00:00.000Z',
};

describe('avatar body setting', () => {
  it('is saved in the profile and synced like any profile change', () => {
    const before: AppData = { ...emptyAppData(), profile };
    const after = applyMutation(before, { type: 'updateProfile', patch: { avatarBody: 'female' } }, '2026-10-28');
    expect(after.profile?.avatarBody).toBe('female');
    expect(after.profile?.startWeightKg).toBe(92); // nothing else changes

    const changes = diffRecords(before, after, '2026-10-28T10:00:00.000Z');
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ collection: 'profile', id: 'me', deleted: false });
    expect(changes[0].data).toMatchObject({ avatarBody: 'female', name: 'Alex' });

    // Another device receives the record.
    const other = applyRecords({ ...emptyAppData(), profile }, [{ ...changes[0], seq: 1 }]);
    expect(other.profile?.avatarBody).toBe('female');
  });

  it('is optional: profiles without it keep working (neutral is shown)', () => {
    expect(({ ...profile } as Profile).avatarBody).toBeUndefined();
  });
});

describe('avatar assets and licence', () => {
  const dir = path.join(root, 'assets/avatars');
  const models = fs.readFileSync(path.join(root, 'src/avatar/models.ts'), 'utf8');

  it('ships only files that the app references, and every reference exists', () => {
    const referenced = [...models.matchAll(/require\('\.\.\/\.\.\/(assets\/avatars\/[^']+)'\)/g)].map((m) => m[1]);
    expect(referenced.length).toBeGreaterThan(0);
    for (const f of referenced) expect(fs.existsSync(path.join(root, f))).toBe(true);
    const shipped: string[] = [];
    const walk = (d: string) =>
      fs.readdirSync(d, { withFileTypes: true }).forEach((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : shipped.push(path.relative(root, path.join(d, e.name)))));
    walk(dir);
    expect(shipped.filter((f) => !f.endsWith('LICENSE-MAKEHUMAN-ASSETS.md')).sort()).toEqual([...referenced].sort());
  });

  it('keeps the bundled 3D assets small (download size budget 2 MB)', () => {
    let bytes = 0;
    const walk = (d: string) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : (bytes += fs.statSync(path.join(d, e.name)).size)));
    walk(dir);
    expect(bytes).toBeLessThan(2 * 1024 * 1024);
  });

  it('includes the CC0 licence of the MakeHuman assets next to them and a notice in the app', () => {
    const file = fs.readFileSync(path.join(dir, 'LICENSE-MAKEHUMAN-ASSETS.md'), 'utf8');
    expect(file).toContain('CC0 1.0 Universal');
    const notice = THIRD_PARTY_NOTICES.find((n) => n.name.includes('MakeHuman'));
    expect(notice?.license).toContain('CC0 1.0');
    expect(THIRD_PARTY_NOTICES.some((n) => n.name.includes('Rocketbox'))).toBe(false); // no longer shipped
  });
});
