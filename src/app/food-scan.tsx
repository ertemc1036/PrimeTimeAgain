import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Card, LoadingState, Screen } from '@/components/ui';
import type { FoodScanResult } from '@/domain/aiSchemas';
import type { FoodItem } from '@/domain/types';
import { aiAvailable, scanFood, type AiError } from '@/services/ai/client';
import { pickPhoto } from '@/services/photos';
import { putScan } from '@/state/handoff';
import { useAuth } from '@/state/AuthProvider';
import { colors, radii, spacing } from '@/theme';
import { newId } from '@/utils/id';

type State = { kind: 'idle' } | { kind: 'busy'; uri: string } | { kind: 'error'; uri?: string; message: string } | { kind: 'result'; uri: string; result: FoodScanResult };

export default function FoodScan() {
  const { t } = useTranslation();
  const { date } = useLocalSearchParams<{ date?: string }>();
  const [state, setState] = useState<State>({ kind: 'idle' });
  const auth = useAuth();
  const signedOut = auth.configured && auth.status !== 'signedIn';
  const available = aiAvailable() && !signedOut;

  const run = async (source: 'camera' | 'library') => {
    const photo = await pickPhoto(source);
    if (!photo.ok) {
      if (photo.reason !== 'cancelled') setState({ kind: 'error', message: photo.reason === 'permission' ? t('ai.camera') : t('scan.failed') });
      return;
    }
    setState({ kind: 'busy', uri: photo.uri });
    const res = await scanFood(photo.base64);
    if (!res.ok) return setState({ kind: 'error', uri: photo.uri, message: t(`ai.${res.error as AiError}`) });
    if (res.data.status !== 'ok' || !res.data.items.length) return setState({ kind: 'error', uri: photo.uri, message: res.data.status === 'not_food' ? t('scan.notFood') : t('scan.failed') });
    setState({ kind: 'result', uri: photo.uri, result: res.data });
  };

  const review = (result: FoodScanResult) => {
    const items: FoodItem[] = result.items.map((i) => ({
      id: newId('item'),
      name: i.name,
      quantity: Math.round(i.estimatedGrams),
      unit: 'g',
      grams: Math.round(i.estimatedGrams),
      nutrition: { kcal: Math.round(i.kcal), protein: i.protein, carbs: i.carbs, fat: i.fat },
    }));
    putScan({ title: result.mealTitle, items });
    router.replace({ pathname: '/food-entry', params: { date, fromScan: '1' } });
  };

  const manual = () => router.replace({ pathname: '/food-entry', params: { date } });

  return (
    <Screen back="close" title={t('scan.title')} subtitle={t('scan.subtitle')}>
      {signedOut ? (
        <Card style={styles.result}>
          <AppText variant="bodyStrong">{t('ai.signed_out')}</AppText>
          <Button label={t('auth.signIn')} size="sm" variant="secondary" fullWidth={false} onPress={() => router.push('/auth/sign-in')} />
        </Card>
      ) : null}
      {!aiAvailable() ? (
        <Card>
          <AppText variant="bodyStrong">{t('ai.not_configured')}</AppText>
          <AppText variant="caption">{t('scan.privacy')}</AppText>
        </Card>
      ) : null}
      {'uri' in state && state.uri ? <Image source={{ uri: state.uri }} style={styles.photo} contentFit="cover" accessibilityIgnoresInvertColors /> : null}
      {state.kind === 'busy' ? <LoadingState label={t('scan.analyzing')} /> : null}
      {state.kind === 'error' ? (
        <Card>
          <AppText variant="bodyStrong" accessibilityLiveRegion="polite">
            {state.message}
          </AppText>
        </Card>
      ) : null}
      {state.kind === 'result' ? (
        <Card style={styles.result}>
          <AppText variant="label" color="secondary">
            {t('scan.result')}
          </AppText>
          <AppText variant="heading">{state.result.mealTitle}</AppText>
          {state.result.items.map((i, idx) => (
            <AppText key={idx} variant="body">
              {i.name} · ~{Math.round(i.estimatedGrams)} g · ~{Math.round(i.kcal)} kcal
            </AppText>
          ))}
          {state.result.uncertaintyNotes.map((n, idx) => (
            <AppText key={idx} variant="caption" color="secondary">
              {n}
            </AppText>
          ))}
          <AppText variant="caption">{t('scan.resultNote')}</AppText>
          <Button label={t('scan.useResult')} onPress={() => review(state.result)} />
        </Card>
      ) : null}
      {state.kind !== 'busy' && state.kind !== 'result' ? (
        <View style={styles.buttons}>
          <Button label={t('scan.take')} icon="camera-outline" onPress={() => void run('camera')} disabled={!available} />
          <Button label={t('scan.library')} icon="images-outline" variant="secondary" onPress={() => void run('library')} disabled={!available} />
        </View>
      ) : null}
      <Button label={t('scan.manual')} variant="ghost" onPress={manual} />
      {available ? (
        <AppText variant="caption" color="secondary">
          {t('scan.privacy')}
        </AppText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  photo: { width: '100%', aspectRatio: 4 / 3, borderRadius: radii.lg, backgroundColor: colors.card },
  result: { gap: spacing.xs },
  buttons: { gap: spacing.sm },
});
