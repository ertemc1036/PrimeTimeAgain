/**
 * Built-in food reference list for offline manual logging.
 *
 * Values are typical per-100 g figures (rounded) for common generic foods, in line with standard
 * public nutrition references such as USDA FoodData Central. Real products and recipes vary, so the
 * app always presents totals as estimates. Branded foods, restaurant meals and recipes are not
 * included; users can add their own foods with their own values.
 *
 * Tuple: [id, name, kcal, protein g, carbs g, fat g, servings]
 */
export interface Serving {
  label: string;
  grams: number;
}

export interface FoodRef {
  id: string;
  name: string;
  per100g: { kcal: number; protein: number; carbs: number; fat: number };
  servings: Serving[];
  /** Liquids are measured in ml (1 ml ≈ 1 g for these values). */
  liquid?: boolean;
}

type Row = [string, string, number, number, number, number, [string, number][], boolean?];

const ROWS: Row[] = [
  // Grains & breakfast
  ['oats', 'Oats (dry)', 389, 16.9, 66.3, 6.9, [['½ cup', 40]]],
  ['oatmeal', 'Oatmeal, cooked with water', 71, 2.5, 12, 1.5, [['bowl', 234]]],
  ['granola', 'Granola', 471, 10, 64, 20, [['½ cup', 60]]],
  ['cornflakes', 'Cornflakes', 357, 7.5, 84, 0.4, [['bowl', 30]]],
  ['bread_white', 'Bread, white', 265, 9, 49, 3.2, [['slice', 30]]],
  ['bread_wholewheat', 'Bread, whole wheat', 252, 12.4, 42.7, 3.5, [['slice', 32]]],
  ['tortilla', 'Tortilla, wheat', 312, 8.3, 51.6, 8, [['tortilla', 45]]],
  ['bagel', 'Bagel, plain', 257, 10, 50, 1.6, [['bagel', 95]]],
  ['rice_cake', 'Rice cake', 387, 8.2, 81.5, 2.8, [['cake', 9]]],
  ['rice_white', 'Rice, white, cooked', 130, 2.7, 28.2, 0.3, [['cup', 158]]],
  ['rice_brown', 'Rice, brown, cooked', 123, 2.7, 25.6, 1, [['cup', 195]]],
  ['pasta', 'Pasta, cooked', 158, 5.8, 30.9, 0.9, [['cup', 140]]],
  ['pasta_wholewheat', 'Pasta, whole wheat, cooked', 149, 6, 30, 1.7, [['cup', 140]]],
  ['quinoa', 'Quinoa, cooked', 120, 4.4, 21.3, 1.9, [['cup', 185]]],
  ['couscous', 'Couscous, cooked', 112, 3.8, 23.2, 0.2, [['cup', 157]]],
  ['potato', 'Potato, boiled', 87, 1.9, 20.1, 0.1, [['medium', 173]]],
  ['sweet_potato', 'Sweet potato, baked', 90, 2, 20.7, 0.2, [['medium', 114]]],
  // Protein
  ['egg', 'Egg', 143, 12.6, 0.7, 9.5, [['large egg', 50]]],
  ['egg_white', 'Egg white', 52, 10.9, 0.7, 0.2, [['egg white', 33]]],
  ['omelet', 'Omelet, plain', 154, 10.6, 0.6, 11.7, [['2-egg omelet', 120]]],
  ['omelet_veg', 'Vegetable omelet', 120, 8, 3, 8.5, [['2-egg omelet', 170]]],
  ['chicken_breast', 'Chicken breast, cooked', 165, 31, 0, 3.6, [['portion', 120]]],
  ['chicken_thigh', 'Chicken thigh, cooked', 209, 26, 0, 10.9, [['thigh', 100]]],
  ['turkey_breast', 'Turkey breast, cooked', 135, 30, 0, 1, [['portion', 120]]],
  ['beef_mince', 'Beef mince 90% lean, cooked', 217, 26, 0, 11.8, [['portion', 120]]],
  ['beef_steak', 'Beef steak, cooked', 206, 29, 0, 9, [['steak', 170]]],
  ['pork_loin', 'Pork loin, cooked', 196, 27, 0, 9, [['portion', 120]]],
  ['salmon', 'Salmon, cooked', 206, 22, 0, 12.4, [['fillet', 150]]],
  ['tuna_can', 'Tuna, canned in water', 116, 25.5, 0, 0.8, [['can', 120]]],
  ['cod', 'Cod, cooked', 105, 23, 0, 0.9, [['fillet', 150]]],
  ['shrimp', 'Shrimp, cooked', 99, 24, 0.2, 0.3, [['portion', 100]]],
  ['tofu', 'Tofu, firm', 144, 17.3, 2.8, 8.7, [['portion', 120]]],
  ['lentils', 'Lentils, cooked', 116, 9, 20.1, 0.4, [['cup', 198]]],
  ['chickpeas', 'Chickpeas, cooked', 164, 8.9, 27.4, 2.6, [['cup', 164]]],
  ['black_beans', 'Black beans, cooked', 132, 8.9, 23.7, 0.5, [['cup', 172]]],
  ['protein_powder', 'Whey protein powder (typical)', 400, 80, 8, 6, [['scoop', 30]]],
  // Dairy
  ['greek_yogurt_0', 'Greek yogurt, plain, non-fat', 59, 10.2, 3.6, 0.4, [['pot', 170]]],
  ['greek_yogurt', 'Greek yogurt, plain, full-fat', 97, 9, 4, 5, [['pot', 170]]],
  ['yogurt', 'Yogurt, natural', 61, 3.5, 4.7, 3.3, [['pot', 125]]],
  ['milk_whole', 'Milk, whole', 61, 3.2, 4.8, 3.3, [['glass', 250]], true],
  ['milk_semi', 'Milk, semi-skimmed', 50, 3.3, 4.8, 2, [['glass', 250]], true],
  ['milk_skim', 'Milk, skimmed', 34, 3.4, 5, 0.1, [['glass', 250]], true],
  ['cottage_cheese', 'Cottage cheese, low-fat', 72, 12.4, 2.7, 1, [['½ cup', 113]]],
  ['cheddar', 'Cheddar cheese', 403, 24.9, 1.3, 33.1, [['slice', 28]]],
  ['mozzarella', 'Mozzarella', 280, 27.5, 3.1, 17.1, [['portion', 30]]],
  ['feta', 'Feta cheese', 264, 14.2, 4.1, 21.3, [['portion', 30]]],
  // Fruit
  ['banana', 'Banana', 89, 1.1, 22.8, 0.3, [['medium', 118]]],
  ['apple', 'Apple', 52, 0.3, 13.8, 0.2, [['medium', 182]]],
  ['orange', 'Orange', 47, 0.9, 11.8, 0.1, [['medium', 131]]],
  ['blueberries', 'Blueberries', 57, 0.7, 14.5, 0.3, [['cup', 148]]],
  ['strawberries', 'Strawberries', 32, 0.7, 7.7, 0.3, [['cup', 152]]],
  ['grapes', 'Grapes', 69, 0.7, 18.1, 0.2, [['cup', 151]]],
  ['pear', 'Pear', 57, 0.4, 15.2, 0.1, [['medium', 178]]],
  ['mango', 'Mango', 60, 0.8, 15, 0.4, [['cup', 165]]],
  // Vegetables
  ['broccoli', 'Broccoli, cooked', 35, 2.4, 7.2, 0.4, [['cup', 156]]],
  ['spinach', 'Spinach, raw', 23, 2.9, 3.6, 0.4, [['cup', 30]]],
  ['salad_greens', 'Mixed salad greens', 17, 1.5, 3.3, 0.2, [['bowl', 85]]],
  ['tomato', 'Tomato', 18, 0.9, 3.9, 0.2, [['medium', 123]]],
  ['cucumber', 'Cucumber', 15, 0.7, 3.6, 0.1, [['½ cucumber', 150]]],
  ['carrot', 'Carrot', 41, 0.9, 9.6, 0.2, [['medium', 61]]],
  ['bell_pepper', 'Bell pepper', 31, 1, 6, 0.3, [['medium', 119]]],
  ['zucchini', 'Zucchini', 17, 1.2, 3.1, 0.3, [['medium', 196]]],
  ['mixed_veg', 'Mixed vegetables, cooked', 65, 2.9, 13.1, 0.2, [['cup', 182]]],
  ['avocado', 'Avocado', 160, 2, 8.5, 14.7, [['½ avocado', 68]]],
  // Fats, nuts, spreads
  ['olive_oil', 'Olive oil', 884, 0, 0, 100, [['tbsp', 13.5]]],
  ['butter', 'Butter', 717, 0.9, 0.1, 81, [['tbsp', 14]]],
  ['peanut_butter', 'Peanut butter', 588, 25, 20, 50, [['tbsp', 16]]],
  ['almonds', 'Almonds', 579, 21.2, 21.6, 49.9, [['handful', 28]]],
  ['walnuts', 'Walnuts', 654, 15.2, 13.7, 65.2, [['handful', 28]]],
  ['hummus', 'Hummus', 166, 7.9, 14.3, 9.6, [['tbsp', 15]]],
  ['honey', 'Honey', 304, 0.3, 82.4, 0, [['tbsp', 21]]],
  ['dark_chocolate', 'Dark chocolate 70%', 598, 7.8, 45.9, 42.6, [['square', 10]]],
  // Common meals & extras
  ['pizza', 'Pizza, cheese', 266, 11.4, 33.3, 9.7, [['slice', 107]]],
  ['burger', 'Hamburger', 254, 13, 26, 11, [['burger', 110]]],
  ['fries', 'French fries', 312, 3.4, 41, 15, [['medium', 117]]],
  // Drinks
  ['coffee', 'Coffee, black', 2, 0.3, 0, 0, [['cup', 240]], true],
  ['latte', 'Caffè latte, semi-skimmed', 43, 2.8, 4.2, 1.6, [['mug', 350]], true],
  ['orange_juice', 'Orange juice', 45, 0.7, 10.4, 0.2, [['glass', 250]], true],
  ['cola', 'Cola', 42, 0, 10.6, 0, [['can', 330]], true],
  ['beer', 'Beer', 43, 0.5, 3.6, 0, [['bottle', 330]], true],
  ['wine', 'Wine, red', 85, 0.1, 2.6, 0, [['glass', 150]], true],
];

export const FOODS: readonly FoodRef[] = ROWS.map(([id, name, kcal, protein, carbs, fat, servings, liquid]) => ({
  id,
  name,
  per100g: { kcal, protein, carbs, fat },
  servings: servings.map(([label, grams]) => ({ label, grams })),
  liquid,
}));

const byId = new Map(FOODS.map((f) => [f.id, f]));
export const getFood = (id: string | undefined) => (id ? byId.get(id) : undefined);
