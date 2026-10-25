import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Card, Chip, Screen, Segmented, TextField, TimeField } from '@/components/ui';
import { parseTime } from '@/domain/dates';
import { checkGoalWeight } from '@/domain/goals';
import type { ActivityPreference, FoodPreferences, GoalType, Units } from '@/domain/types';
import { BodyFields, type BodyInputs } from '@/features/BodyFields';
import { useFoodSuggestions } from '@/features/foodSuggestions';
import { TagInput } from '@/features/TagInput';
import { formatWeight, heightToInputs, parseHeight, parseWeight, weightToInput, weightUnit } from '@/features/units';
import { useSave } from '@/hooks/useSave';
import { useAppState } from '@/state/AppStateProvider';
import { spacing } from '@/theme';

const GOALS: GoalType[] = ['habits', 'nutrition', 'active', 'weight'];
const ACTIVITIES: ActivityPreference[] = ['gym', 'walking', 'running', 'home', 'combination'];

export default function Health() {
  const { t } = useTranslation();
  const FOOD_SUGGESTIONS = useFoodSuggestions();
  const { data } = useAppState();
  const save = useSave();
  const p = data.profile!;
  const [name, setName] = useState(p.name);
  const [units, setUnits] = useState<Units>(p.units);
  const [body, setBody] = useState<BodyInputs>({ ...heightToInputs(p.heightCm), weight: weightToInput(p.startWeightKg, p.units) });
  const [goals, setGoals] = useState(p.goals);
  const [goalText, setGoalText] = useState(weightToInput(p.goalWeightKg, p.units));
  const [acts, setActs] = useState(p.activityPrefs);
  const [food, setFood] = useState<FoodPreferences>(p.food);
  const [planningTime, setPlanningTime] = useState(p.planningTime);

  const height = parseHeight(body.cm, body.ft, body.inch, units);
  const weight = parseWeight(body.weight, units);
  const goalKg = goals.includes('weight') ? parseWeight(goalText, units) : undefined;
  const check = goalKg ? checkGoalWeight(goalKg, weight ?? undefined, height ?? undefined) : null;
  const goalError =
    goalKg === null ? t('onboarding.goals.invalid') : check && !check.ok && check.reason === 'underweight' ? t('onboarding.goals.underweight', { min: formatWeight(check.minHealthyKg ?? 0, units) }) : undefined;
  const valid = name.trim() && height !== null && weight !== null && !goalError && parseTime(planningTime) !== null;

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const onSave = async () => {
    if (!valid) return;
    const r = await save(
      {
        type: 'updateProfile',
        patch: { name: name.trim(), units, heightCm: height ?? undefined, startWeightKg: weight ?? undefined, goals: goals.length ? goals : p.goals, goalWeightKg: goalKg ?? undefined, activityPrefs: acts.length ? acts : p.activityPrefs, food, planningTime },
      },
      t('health.saved'),
    );
    if (r.ok) router.back();
  };

  return (
    <Screen back="back" title={t('health.title')} footer={<Button label={t('health.save')} onPress={() => void onSave()} disabled={!valid} />}>
      <TextField label={t('onboarding.profile.name')} value={name} onChangeText={setName} maxLength={40} />
      <Segmented
        value={units}
        options={[
          { value: 'metric', label: t('onboarding.profile.metric') },
          { value: 'imperial', label: t('onboarding.profile.imperial') },
        ]}
        onChange={(u) => {
          setBody({ ...heightToInputs(height ?? undefined), weight: weightToInput(weight ?? undefined, u) });
          setGoalText(weightToInput(goalKg ?? undefined, u));
          setUnits(u);
        }}
      />
      <BodyFields units={units} value={body} onChange={setBody} heightError={height === null ? t('onboarding.goals.invalid') : undefined} weightError={weight === null ? t('onboarding.goals.invalid') : undefined} />
      <View style={styles.group}>
        <AppText variant="subheading">{t('onboarding.goals.title')}</AppText>
        <View style={styles.chips}>
          {GOALS.map((g) => (
            <Chip key={g} label={t(`onboarding.goals.${g}`)} selected={goals.includes(g)} onPress={() => setGoals(toggle(goals, g))} />
          ))}
        </View>
      </View>
      {goals.includes('weight') ? (
        <TextField label={t('onboarding.goals.goalWeight')} optional={t('common.optional')} value={goalText} onChangeText={setGoalText} keyboardType="decimal-pad" suffix={weightUnit(units)} error={goalError} />
      ) : null}
      {check && !check.ok && check.reason === 'large_change' ? (
        <Card>
          <AppText variant="body">{t('onboarding.goals.largeChange')}</AppText>
        </Card>
      ) : null}
      <View style={styles.group}>
        <AppText variant="subheading">{t('onboarding.activity.title')}</AppText>
        <View style={styles.chips}>
          {ACTIVITIES.map((a) => (
            <Chip key={a} label={t(`onboarding.activity.${a}`)} selected={acts.includes(a)} onPress={() => setActs(toggle(acts, a))} />
          ))}
        </View>
      </View>
      <TagInput label={t('onboarding.nutrition.preferred')} values={food.preferred} onChange={(preferred) => setFood({ ...food, preferred })} suggestions={FOOD_SUGGESTIONS.preferred} />
      <TagInput label={t('onboarding.nutrition.restrictions')} values={food.restrictions} onChange={(restrictions) => setFood({ ...food, restrictions })} suggestions={FOOD_SUGGESTIONS.restrictions} />
      <TagInput label={t('onboarding.nutrition.allergies')} values={food.allergies} onChange={(allergies) => setFood({ ...food, allergies })} suggestions={FOOD_SUGGESTIONS.allergies} hint={t('onboarding.nutrition.allergyNote')} />
      <TagInput label={t('onboarding.nutrition.dislikes')} values={food.dislikes} onChange={(dislikes) => setFood({ ...food, dislikes })} />
      <TimeField label={t('profile.planningTime')} value={planningTime} onChange={setPlanningTime} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
