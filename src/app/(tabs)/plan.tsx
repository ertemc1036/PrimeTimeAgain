import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Card, Chip, Icon, OptionCard, PressableScale, ProBadge, Screen, TextField, TimeField, ToggleRow } from '@/components/ui';
import { isPlanComplete } from '@/domain/completion';
import { addDays, parseTime } from '@/domain/dates';
import { totals } from '@/domain/nutrition';
import { MEAL_TYPES, type DayPlan, type ISODate, type PlannedActivity, type PlannedActivityType } from '@/domain/types';
import { ACTIVITY_ICONS, mealLabel } from '@/features/labels';
import { cloneMeals, emptyPlan, previousPlanWithMeals } from '@/features/plan';
import { parseNum } from '@/features/units';
import { useSave } from '@/hooks/useSave';
import { formatDate } from '@/i18n/format';
import { useLocale } from '@/i18n/useLanguage';
import { useAppState } from '@/state/AppStateProvider';
import { usePro } from '@/state/ProProvider';
import { colors, radii, spacing } from '@/theme';
import { nowISO } from '@/utils/id';

export default function PlanTab() {
  const { today } = useAppState();
  const [date, setDate] = useState<ISODate>(addDays(today, 1));
  // Remount the editor per date so the local draft always belongs to the selected day.
  return <PlanEditor key={date} date={date} setDate={setDate} />;
}

const DURATIONS = [15, 30, 45, 60, 90];

function PlanEditor({ date, setDate }: { date: ISODate; setDate: (d: ISODate) => void }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const { data, today } = useAppState();
  const { canOpenPro } = usePro();
  const save = useSave();
  const stored: DayPlan = data.plans[date] ?? emptyPlan(date);
  const isTomorrow = date === addDays(today, 1);

  const [flexible, setFlexible] = useState(stored.flexibleMeals);
  const [type, setType] = useState<PlannedActivityType | null>(stored.activity?.type ?? null);
  const [time, setTime] = useState(stored.activity?.time ?? '18:00');
  const [duration, setDuration] = useState(stored.activity?.durationMin ? String(stored.activity.durationMin) : '');
  const [notes, setNotes] = useState(stored.activity?.notes ?? '');
  const [error, setError] = useState<string | null>(null);

  const meals = stored.meals;
  const durationMin = parseNum(duration);
  const activity: PlannedActivity | null = type
    ? type === 'rest'
      ? { type }
      : { type, time: parseTime(time) !== null ? time : undefined, durationMin: durationMin && durationMin > 0 ? Math.round(durationMin) : undefined, notes: notes.trim() || undefined }
    : null;
  const draft: DayPlan = { ...stored, flexibleMeals: meals.length ? false : flexible, activity };
  const dirty = JSON.stringify({ f: draft.flexibleMeals, a: draft.activity }) !== JSON.stringify({ f: stored.flexibleMeals, a: stored.activity });
  const saved = !!stored.savedAt && !dirty && isPlanComplete(stored);
  // Hide a validation message as soon as the user has fixed what it asked for.
  const shownError = error === t('plan.needMeals') && (meals.length || flexible) ? null : error === t('plan.needActivity') && type ? null : error;

  const onSave = async () => {
    if (!meals.length && !flexible) return setError(t('plan.needMeals'));
    if (!type) return setError(t('plan.needActivity'));
    if (type !== 'rest' && (!activity?.time || !activity.durationMin)) return setError(t('plan.needTime'));
    setError(null);
    await save({ type: 'savePlan', plan: { ...draft, savedAt: nowISO(), savedOn: today, updatedAt: nowISO() } }, t('plan.saved'));
  };

  const copyPrevious = async () => {
    const prev = previousPlanWithMeals(data, date);
    if (!prev) return setError(t('plan.copyNothing'));
    setError(null);
    await save({ type: 'savePlan', plan: { ...stored, meals: [...stored.meals, ...cloneMeals(prev.meals)], flexibleMeals: false, updatedAt: nowISO() } }, t('plan.copied', { date: formatDate(prev.date, locale, { day: 'numeric', month: 'short' }) }));
  };

  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));

  return (
    <Screen
      inTabs
      title={isTomorrow ? t('plan.title') : t('plan.titleDate', { date: formatDate(date, locale, { weekday: 'long', day: 'numeric', month: 'short' }) })}
      subtitle={t('plan.subtitle')}
      footer={
        <>
          {shownError ? (
            <AppText variant="bodyStrong" align="center" accessibilityLiveRegion="polite">
              {shownError}
            </AppText>
          ) : null}
          <Button label={saved ? t('plan.saved') : isTomorrow ? t('plan.save') : t('plan.saveDate')} icon={saved ? 'checkmark' : undefined} onPress={() => void onSave()} variant={saved ? 'secondary' : 'primary'} />
        </>
      }>
      <View style={styles.days} accessibilityLabel={t('plan.date')}>
        {days.map((d) => (
          <Chip
            key={d}
            mode="radio"
            selected={d === date}
            label={d === today ? t('common.today') : d === addDays(today, 1) ? t('common.tomorrow') : formatDate(d, locale, { weekday: 'short', day: 'numeric' })}
            onPress={() => setDate(d)}
          />
        ))}
      </View>

      <Card variant="outline" style={styles.aiCard}>
        <View style={styles.aiRow}>
          <Icon name="sparkles-outline" size={22} />
          <View style={styles.flex}>
            <AppText variant="bodyStrong">{t('plan.ai')}</AppText>
            <AppText variant="caption" color="secondary">
              {t('plan.aiHint')}
            </AppText>
          </View>
          <ProBadge label={t('common.pro')} />
        </View>
        <Button label={t('plan.ai')} size="sm" variant="secondary" onPress={() => router.push(canOpenPro ? { pathname: '/coach', params: { topic: 'plan' } } : '/pro')} />
      </Card>

      <AppText variant="heading">{t('plan.meals')}</AppText>
      {MEAL_TYPES.map((mt) => {
        const list = meals.filter((m) => m.mealType === mt);
        return (
          <View key={mt} style={styles.mealGroup}>
            <AppText variant="label" color="secondary">
              {mealLabel(t, mt)}
              {mt === 'snack' ? ` · ${t('common.optional')}` : ''}
            </AppText>
            {list.map((m) => {
              const tot = totals(m.items);
              return (
                <PressableScale key={m.id} style={styles.meal} accessibilityRole="button" onPress={() => router.push({ pathname: '/plan-meal', params: { date, mealType: mt, id: m.id } })}>
                  <View style={styles.flex}>
                    <AppText variant="bodyStrong">{m.title}</AppText>
                    <AppText variant="caption" color="secondary">
                      {[m.time, tot.estimated ? t('common.kcal', { value: tot.kcal }) : null, m.notes].filter(Boolean).join(' · ') || t('items.noEstimate')}
                    </AppText>
                  </View>
                  <Icon name="create-outline" size={20} />
                </PressableScale>
              );
            })}
            <Button label={t('plan.addMeal', { meal: mealLabel(t, mt, true) })} icon="add" variant="outline" size="md" onPress={() => router.push({ pathname: '/plan-meal', params: { date, mealType: mt } })} />
          </View>
        );
      })}
      <View style={styles.row}>
        <Button label={t('plan.copyDay')} icon="copy-outline" variant="ghost" size="sm" fullWidth={false} onPress={() => void copyPrevious()} />
      </View>
      {!meals.length ? (
        <Card variant="outline" padded={false}>
          <ToggleRow label={t('plan.flexible')} hint={t('plan.flexibleHint')} value={flexible} onChange={setFlexible} divider={false} />
        </Card>
      ) : null}

      <AppText variant="heading">{isTomorrow ? t('plan.activity') : t('plan.activityFor')}</AppText>
      <View style={styles.tiles}>
        {(['gym', 'outdoor', 'home', 'rest'] as const).map((k) => {
          const selected = k === 'outdoor' ? type === 'outdoor_walk' || type === 'outdoor_run' : type === k;
          return (
            <OptionCard
              key={k}
              layout="tile"
              icon={ACTIVITY_ICONS[k]}
              title={k === 'rest' ? t('activity.rest') : k === 'home' ? t('activity.home') : t(`activity.${k}`)}
              selected={selected}
              onPress={() => setType(k === 'outdoor' ? (type === 'outdoor_run' ? 'outdoor_run' : 'outdoor_walk') : k)}
            />
          );
        })}
      </View>
      {type === 'outdoor_walk' || type === 'outdoor_run' ? (
        <View style={styles.row}>
          <Chip mode="radio" label={t('activity.walking')} selected={type === 'outdoor_walk'} onPress={() => setType('outdoor_walk')} />
          <Chip mode="radio" label={t('activity.running')} selected={type === 'outdoor_run'} onPress={() => setType('outdoor_run')} />
        </View>
      ) : null}
      {type && type !== 'rest' ? (
        <View style={styles.fields}>
          <TimeField label={t('plan.time')} value={time} onChange={setTime} />
          <View style={styles.fields}>
            <AppText variant="label">{t('plan.duration')}</AppText>
            <View style={styles.row}>
              {DURATIONS.map((d) => (
                <Chip key={d} mode="radio" label={t('common.min', { count: d })} selected={durationMin === d} onPress={() => setDuration(String(d))} />
              ))}
            </View>
            <TextField label={t('workoutLog.customMinutes')} value={duration} onChangeText={setDuration} keyboardType="number-pad" suffix="min" />
          </View>
          <TextField label={t('plan.notes')} optional={t('common.optional')} placeholder={t('plan.notesPlaceholder')} value={notes} onChangeText={setNotes} maxLength={200} />
        </View>
      ) : null}
      {type === 'rest' ? (
        <Card>
          <AppText variant="body">{t('plan.restBody')}</AppText>
        </Card>
      ) : null}
      {dirty && stored.savedAt ? (
        <AppText variant="caption" color="secondary">
          {t('plan.unsaved')}
        </AppText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  flex: { flex: 1, gap: 2 },
  aiCard: { gap: spacing.sm },
  aiRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  mealGroup: { gap: spacing.xs },
  meal: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.card, borderRadius: radii.md, padding: spacing.md },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  fields: { gap: spacing.sm },
});
