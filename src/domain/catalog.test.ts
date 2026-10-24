import glyphMap from '@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json';

import de from '@/i18n/locales/de.json';
import en from '@/i18n/locales/en.json';
import tr from '@/i18n/locales/tr.json';

import { ACTIONS, AREA_ICONS, CUSTOM_ACTIONS, GOAL_TEMPLATES } from './catalog';
import { AREAS } from './types';

const locales = { en, de, tr } as const;

describe('catalogue content', () => {
  it.each(Object.keys(locales))('%s has text for every goal, action and area', (code) => {
    const l = locales[code as keyof typeof locales] as unknown as {
      goals: Record<string, { title: string; outcome: string }>;
      actions: Record<string, string>;
      areas: Record<string, string>;
    };
    for (const g of GOAL_TEMPLATES) expect([g.id, !!l.goals[g.id]?.title, !!l.goals[g.id]?.outcome]).toEqual([g.id, true, true]);
    for (const a of [...ACTIONS, ...CUSTOM_ACTIONS]) expect([a.id, !!l.actions[a.id]]).toEqual([a.id, true]);
    for (const a of AREAS) expect([a, !!l.areas[a]]).toEqual([a, true]);
  });

  it('uses only existing Ionicons glyphs', () => {
    const names = [...ACTIONS.map((a) => a.icon), ...CUSTOM_ACTIONS.map((a) => a.icon), ...GOAL_TEMPLATES.map((g) => g.icon), ...Object.values(AREA_ICONS)];
    const missing = names.filter((n) => !(n in (glyphMap as Record<string, number>)));
    expect(missing).toEqual([]);
  });
});
