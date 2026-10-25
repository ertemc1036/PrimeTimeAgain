import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Card, LoadingState, Screen } from '@/components/ui';
import type { EnvironmentAssessment, WorkoutType } from '@/domain/types';
import { assessPhoto, type PhotoOutcome } from '@/domain/workoutPhoto';
import { activityLabel } from '@/features/labels';
import { aiAvailable, analyzeWorkoutPhoto, type AiError } from '@/services/ai/client';
import { pickPhoto, storePrivately } from '@/services/photos';
import { putWorkoutPhoto } from '@/state/handoff';
import { colors, radii, spacing } from '@/theme';
import { newId } from '@/utils/id';

type State =
  | { kind: 'idle' }
  | { kind: 'busy'; uri: string }
  | { kind: 'error'; uri?: string; message: string }
  | { kind: 'done'; uri: string; outcome: PhotoOutcome; assessment: EnvironmentAssessment };

export default function WorkoutPhoto() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ type: WorkoutType; date?: string }>();
  const type = params.type ?? 'gym';
  const [state, setState] = useState<State>({ kind: 'idle' });
  const available = aiAvailable();
  const label = activityLabel(t, type);

  const take = async () => {
    const photo = await pickPhoto('camera');
    if (!photo.ok) {
      if (photo.reason !== 'cancelled') setState({ kind: 'error', message: photo.reason === 'permission' ? t('ai.camera') : t('workoutPhoto.failed') });
      return;
    }
    setState({ kind: 'busy', uri: photo.uri });
    const res = await analyzeWorkoutPhoto(photo.base64, type);
    if (!res.ok) return setState({ kind: 'error', uri: photo.uri, message: t(`ai.${res.error as AiError}`) });
    const { outcome, assessment } = assessPhoto(res.data, type);
    setState({ kind: 'done', uri: photo.uri, outcome, assessment });
  };

  const continueToLog = async (uri: string, assessment: EnvironmentAssessment) => {
    const stored = await storePrivately(uri, newId('workout'));
    putWorkoutPhoto({ type, photoUri: stored, assessment });
    router.replace({ pathname: '/workout-log', params: { type, date: params.date, fromPhoto: '1' } });
  };
  const manual = () => router.replace({ pathname: '/workout-log', params: { type, date: params.date } });

  const outcomeText = (s: Extract<State, { kind: 'done' }>) =>
    s.outcome === 'recognized'
      ? t(`workoutPhoto.recognized.${s.assessment.environment as 'gym' | 'outdoor' | 'home'}`)
      : s.outcome === 'mismatch'
        ? t('workoutPhoto.mismatch', { activity: label })
        : t('workoutPhoto.uncertain');

  return (
    <Screen back="close" title={t('workoutPhoto.title')} subtitle={t('workoutPhoto.subtitle')}>
      {!available ? (
        <Card>
          <AppText variant="bodyStrong">{t('ai.not_configured')}</AppText>
        </Card>
      ) : null}
      <Card variant="outline">
        <AppText variant="caption">{t('workoutPhoto.privacy')}</AppText>
      </Card>
      {'uri' in state && state.uri ? <Image source={{ uri: state.uri }} style={styles.photo} contentFit="cover" /> : null}
      {state.kind === 'busy' ? <LoadingState label={t('workoutPhoto.analyzing')} /> : null}
      {state.kind === 'error' ? (
        <Card>
          <AppText variant="bodyStrong">{state.message}</AppText>
        </Card>
      ) : null}
      {state.kind === 'done' ? (
        <Card style={styles.result}>
          <AppText variant="heading">{outcomeText(state)}</AppText>
          <AppText variant="body" color="secondary">
            {state.assessment.summary}
          </AppText>
          {state.outcome === 'recognized' ? <AppText variant="body">{t('workoutPhoto.confirm')}</AppText> : null}
          <AppText variant="caption">{t('workoutPhoto.disclaimer')}</AppText>
          <Button label={state.outcome === 'recognized' ? t('common.continue') : t('workoutPhoto.correct')} onPress={() => void continueToLog(state.uri, state.assessment)} />
          <Button label={t('workoutPhoto.retake')} variant="secondary" onPress={() => void take()} />
        </Card>
      ) : null}
      <View style={styles.buttons}>
        {state.kind === 'idle' || state.kind === 'error' ? (
          <Button label={state.kind === 'error' ? t('workoutPhoto.retake') : t('workoutPhoto.take', { activity: label })} icon="camera-outline" onPress={() => void take()} disabled={!available} />
        ) : null}
        <Button label={t('workoutPhoto.manual')} variant="ghost" onPress={manual} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  photo: { width: '100%', aspectRatio: 4 / 3, borderRadius: radii.lg, backgroundColor: colors.card },
  result: { gap: spacing.sm },
  buttons: { gap: spacing.sm },
});
