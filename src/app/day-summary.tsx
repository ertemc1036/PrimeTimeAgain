import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Chip, DayTypeDot, Icon, Screen, StatTile, TextField } from '@/components/ui';
import { newId } from '@/domain/plan';
import type { Mood } from '@/domain/types';
import { useAppState } from '@/state/AppStateProvider';
import { useStreak, useToday } from '@/state/selectors';
import { radii, spacing, status, useColors } from '@/theme';

const MOODS: Mood[] = [1, 2, 3, 4, 5];

/** End of day: "TODAY YOU SHOWED UP." with a short summary and an optional reflection. */
export default function DaySummaryScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const { today, dispatch } = useAppState();
  const day = useToday();
  const streak = useStreak();
  const [mood, setMood] = useState<Mood | null>(null);
  const [body, setBody] = useState('');
  const goalsWorked = new Set(day.planned.filter((m) => m.status === 'done').map((m) => m.goalId)).size;

  const save = async () => {
    if (body.trim() || mood) {
      await dispatch({
        type: 'addReflection',
        reflection: { id: newId('r'), date: today, mood: mood ?? 3, body: body.trim(), createdAt: new Date().toISOString() },
      }).catch(() => undefined);
    }
    router.back();
  };

  return (
    <Screen back="close" footer={<Button label={body.trim() || mood ? t('summary.save') : t('summary.close')} onPress={save} />}>
      <Animated.View entering={ZoomIn.duration(500)} style={[styles.badge, { backgroundColor: status.prime }]}>
        <Icon name="check" size={34} color="#08090B" />
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(120).duration(450)}>
        <AppText variant="hero">{t('summary.title')}</AppText>
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(220).duration(450)} style={styles.grid}>
        <View style={styles.row}>
          <StatTile value={`${day.doneCount}/${day.total}`} label={t('summary.missions')} />
          <StatTile value={t('common.minutes', { count: day.minutesDone })} label={t('summary.time')} />
        </View>
        <View style={styles.row}>
          <StatTile value={String(goalsWorked)} label={t('summary.goals')} />
          <StatTile value={t('common.days', { count: streak.current })} label={t('summary.streak')} />
        </View>
      </Animated.View>
      <View style={[styles.dayType, { backgroundColor: colors.surface }]}>
        <DayTypeDot type={day.type} size={12} />
        <AppText variant="caption" color="secondary">
          {t('summary.dayType')}
        </AppText>
        <AppText variant="bodyStrong">{t(`dayTypes.${day.type}`)}</AppText>
      </View>
      <View style={styles.reflect}>
        <AppText variant="subheading">{t('summary.reflect')}</AppText>
        <View style={styles.moods} accessibilityRole="radiogroup">
          {MOODS.map((m) => (
            <Chip key={m} mode="radio" label={t(`reflection.moods.${m}`)} selected={mood === m} onPress={() => setMood(mood === m ? null : m)} />
          ))}
        </View>
        <TextField label={t('reflection.label')} placeholder={t('summary.reflectPlaceholder')} value={body} onChangeText={setBody} multiline maxLength={1000} hint={t('reflection.private')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  badge: { width: 64, height: 64, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  grid: { gap: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.xs },
  dayType: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, padding: spacing.md, borderRadius: radii.md, flexWrap: 'wrap' },
  reflect: { gap: spacing.sm },
  moods: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
