import { FOODS } from './foods';
import { foodName, hasAllFoodNames, hasAllServingNames, servingLabel } from './foodNames';
import { itemFromFood, searchFoods } from './nutrition';

describe('translated foods', () => {
  it('has a name in every language for every built-in food and serving', () => {
    expect(hasAllFoodNames(FOODS.map((f) => f.id))).toBe(true);
    expect(hasAllServingNames([...new Set(FOODS.flatMap((f) => f.servings.map((s) => s.label)))])).toBe(true);
  });

  it('finds foods by their translated or English name', () => {
    expect(searchFoods('haferflocken', [], 5, 'de').foods[0].id).toBe('oats');
    expect(searchFoods('tavuk göğsü', [], 5, 'tr').foods[0].id).toBe('chicken_breast');
    expect(searchFoods('plátano', [], 5, 'es').foods[0].id).toBe('banana');
    expect(searchFoods('pomme', [], 5, 'fr').foods.map((f) => f.id)).toContain('apple');
    expect(searchFoods('banana', [], 5, 'de').foods[0].id).toBe('banana');
  });

  it('keeps nutrition identical across languages and stores the shown name', () => {
    const en = itemFromFood('a', 'oats', 1, '½ cup', 'en')!;
    const de = itemFromFood('a', 'oats', 1, '½ cup', 'de')!;
    expect(de.nutrition).toEqual(en.nutrition);
    expect(de.name).toBe(foodName(FOODS.find((f) => f.id === 'oats')!, 'de'));
    expect(de.unit).toBe('½ cup'); // stored key stays English; only the label is translated
    expect(servingLabel('½ cup', 'de')).toBe('½ Tasse');
  });
});
