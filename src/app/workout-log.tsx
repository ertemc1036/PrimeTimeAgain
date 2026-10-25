import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Card, Chip, Screen, TextField, TimeField } from '@/components/ui';
import { canEditCheckIns } from '@/domain/completion';
import { nowTime } from '@/domain/dates';
import type { ActivityLog, WorkoutType } from '@/domain/types';
import { validateWorkout, type WorkoutInput } from '@/domain/validation';
import { DaySwitch } from '@/features/DaySwitch';
import { activityLabel, WORKOUT_TYPES } from '@/features/labels';
import { parseNum } from '@/features/units';
import { useSave } from '@/hooks/useSave';
import { useAppState } from '@/state/AppStateProvider';
import { takeWorkoutPhoto } from '@/state/handoff';
import { spacing } from '@/theme';
import { confirm } from '@/utils/confirm';
import { newId, nowISO } from '@/utils/id';

const QUICK = [15, 30, 45, 60];

export default function WorkoutLog() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ id?: string; type?: WorkoutType; date?: string; fromPhoto?: string }>();
  const { data, today } = useAppState();
  const save = useSave();
  const existing = data.activityLogs.find((a) => a.id === params.id);
  const [photo] = useState(() => (params.fromPhoto ? takeWorkoutPhoto() : undefined));
  const [date, setDate] = useState(existing?.date ?? params.date ?? today);
  const plan = data.plans[date]?.activity;
  const initialType = existing?.type ?? photo?.type ?? params.type;
  const fromPlan = plan && plan.type === initialType ? plan : undefined;

  const [type, setType] = useState<WorkoutType | undefined>(initialType);
  const [startTime, setStartTime] = useState(() => existing?.startTime ?? fromPlan?.time ?? nowTime());
  const [duration, setDuration] = useState(String(existing?.durationMin ?? fromPlan?.durationMin ?? ''));
  const [custom, setCustom] = useState(!!duration && !QUICK.includes(Number(duration)));
  const [description, setDescription] = useState(existing?.description ?? fromPlan?.notes ?? '');
  const [errors, setErrors] = useState<Partial<Record<keyof WorkoutInput | 'form', string>>>({});
  const editable = canEditCheckIns(date, today);

  const recent = [...new Set(data.activityLogs.filter((a) => !type || a.type === type).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).map((a) => a.description))].slice(0, 5);

  const onSave = async () => {
    const v = validateWorkout({ type, date, startTime, durationMin: parseNum(duration), description });
    if (!v.ok) {
      setErrors(Object.fromEntries(Object.entries(v.errors).map(([k, msg]) => [k, t(msg as 'validation.duration')])));
      return;
    }
    setErrors({});
    const now = nowISO();
    const log: ActivityLog = {
      id: existing?.id ?? newId('act'),
      ...v.value,
      entryMethod: existing?.entryMethod ?? (photo ? 'photo' : 'manual'),
      photoUri: existing?.photoUri ?? photo?.photoUri,
      aiEnvironment: existing?.aiEnvironment ?? photo?.assessment,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    const r = await save({ type: 'upsertActivity', log }, t('workoutLog.saved'));
    if (r.ok) router.back();
    else if (r.reason === 'duplicate') setErrors({ form: t('workoutLog.duplicate') });
  };

  const onDelete = async () => {
    if (!existing) return;
    const ok = await confirm({ title: t('workoutLog.deleteTitle'), message: t('workoutLog.deleteBody'), confirmLabel: t('common.delete'), cancelLabel: t('common.cancel'), destructive: true });
    if (!ok) return;
    const r = await save({ type: 'deleteActivity', id: existing.id }, t('workoutLog.deleted'));
    if (r.ok) router.back();
  };

  const label = type ? activityLabel(t, type) : t('workoutLog.activity');

  return (
    <Screen
      back="close"
      title={existing ? t('workoutLog.editTitle', { activity: label }) : t('workoutLog.title', { activity: label })}
      footer={
        editable ? (
          <>
            {errors.form ? (
              <AppText variant="bodyStrong" align="center" accessibilityLiveRegion="polite">
                {errors.form}
              </AppText>
            ) : null}
            <Button label={photo ? t('workoutLog.saveCheckIn') : t('workoutLog.save')} onPress={() => void onSave()} />
            {existing ? <Button label={t('workoutLog.delete')} variant="ghost" onPress={() => void onDelete()} /> : null}
          </>
        ) : undefined
      }>
      {!editable ? (
        <Card>
          <AppText variant="body">{t('states.locked')}</AppText>
        </Card>
      ) : null}
      {photo ? (
        <Card>
          <AppText variant="bodyStrong">{photo.assessment.summary}</AppText>
          <AppText variant="caption">{t('workoutPhoto.disclaimer')}</AppText>
        </Card>
      ) : null}
      <View style={styles.group}>
        <AppText variant="label">{t('workoutLog.activity')}</AppText>
        <View style={styles.chips}>
          {WORKOUT_TYPES.map((w) => (
            <Chip key={w} mode="radio" label={activityLabel(t, w)} selected={type === w} onPress={() => setType(w)} />
          ))}
        </View>
        {errors.type ? <AppText variant="bodyStrong">{errors.type}</AppText> : null}
      </View>
      {!existing ? (
        <View style={styles.group}>
          <AppText variant="label">{t('workoutLog.date')}</AppText>
          <DaySwitch today={today} value={date} onChange={setDate} />
        </View>
      ) : null}
      <TimeField label={t('workoutLog.startTime')} value={startTime} onChange={setStartTime} error={errors.startTime} />
      <View style={styles.group}>
        <AppText variant="label">{t('workoutLog.duration')}</AppText>
        <View style={styles.chips}>
          {QUICK.map((d) => (
            <Chip
              key={d}
              mode="radio"
              label={t('common.min', { count: d })}
              selected={!custom && Number(duration) === d}
              onPress={() => {
                setCustom(false);
                setDuration(String(d));
              }}
            />
          ))}
          <Chip mode="radio" label={t('workoutLog.custom')} selected={custom} onPress={() => setCustom(true)} />
        </View>
        {custom ? <TextField label={t('workoutLog.customMinutes')} value={duration} onChangeText={setDuration} keyboardType="number-pad" suffix="min" maxLength={3} /> : null}
        {errors.durationMin ? <AppText variant="bodyStrong">{errors.durationMin}</AppText> : null}
      </View>
      <TextField
        label={t('workoutLog.description')}
        placeholder={t('workoutLog.descriptionPlaceholder')}
        value={description}
        onChangeText={setDescription}
        maxLength={200}
        error={errors.description}
      />
      {recent.length ? (
        <View style={styles.group}>
          <AppText variant="label" color="secondary">
            {t('workoutLog.recent')}
          </AppText>
          <View style={styles.chips}>
            {recent.map((r) => (
              <Chip key={r} label={r} selected={description === r} onPress={() => setDescription(r)} />
            ))}
          </View>
        </View>
      ) : null}
      <AppText variant="caption" color="secondary">
        {t('workoutLog.note')}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
