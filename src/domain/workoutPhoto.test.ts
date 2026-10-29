import { foodScanSchema, workoutPhotoSchema } from './aiSchemas';
import { assessPhoto } from './workoutPhoto';

describe('workout photo assessment', () => {
  it('recognises matching environments', () => {
    expect(assessPhoto({ environment: 'gym', confidence: 'high', summary: 'Weight machines' }, 'gym').outcome).toBe('recognized');
    expect(assessPhoto({ environment: 'outdoor', confidence: 'medium', summary: 'Park path' }, 'outdoor_run').outcome).toBe('recognized');
  });
  it('treats unclear or low-confidence results as uncertain', () => {
    expect(assessPhoto({ environment: 'unclear', confidence: 'low', summary: '' }, 'home').outcome).toBe('uncertain');
    expect(assessPhoto({ environment: 'home', confidence: 'low', summary: 'Mat' }, 'home').outcome).toBe('uncertain');
  });
  it('flags mismatches without blocking', () => {
    const r = assessPhoto({ environment: 'gym', confidence: 'high', summary: 'Treadmills' }, 'outdoor_walk');
    expect(r).toMatchObject({ outcome: 'mismatch', assessment: { matchesSelected: false } });
  });
});

describe('AI output schemas', () => {
  it('reject malformed model output', () => {
    expect(workoutPhotoSchema.safeParse({ environment: 'beach', confidence: 'high', summary: '' }).success).toBe(false);
    expect(foodScanSchema.safeParse({ status: 'ok', mealTitle: 'x', confidence: 'low', items: [{ name: 'rice', estimatedGrams: -1, kcal: 1, protein: 1, carbs: 1, fat: 1, confidence: 'low' }], uncertaintyNotes: [] }).success).toBe(false);
    const rice = { name: 'Rice', estimatedGrams: 150, kcal: 195, protein: 4, carbs: 42, fat: 0.4, confidence: 'medium' };
    expect(foodScanSchema.safeParse({ status: 'ok', mealTitle: 'Chicken and rice', confidence: 'medium', items: [rice], uncertaintyNotes: ['Oil not visible'] }).success).toBe(true);
    // Every estimate must say how sure it is.
    expect(foodScanSchema.safeParse({ status: 'ok', mealTitle: 'Chicken and rice', items: [rice], uncertaintyNotes: [] }).success).toBe(false);
    expect(foodScanSchema.safeParse({ status: 'ok', mealTitle: 'Chicken and rice', confidence: 'sure', items: [rice], uncertaintyNotes: [] }).success).toBe(false);
    expect(foodScanSchema.safeParse({ status: 'ok', mealTitle: 'Rice', confidence: 'high', items: [{ ...rice, confidence: undefined }], uncertaintyNotes: [] }).success).toBe(false);
  });
});
