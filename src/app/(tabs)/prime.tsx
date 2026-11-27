import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Card, Chip, IconButton, Screen } from '@/components/ui';
import { toFoodItems } from '@/domain/primeActions';
import { ActionCard } from '@/features/prime/ActionCard';
import { PrimeBadge } from '@/features/prime/PrimeBadge';
import { usePrime } from '@/features/prime/usePrime';
import { aiAvailable, type AiError } from '@/services/ai/client';
import { useAppState } from '@/state/AppStateProvider';
import { useAuth } from '@/state/AuthProvider';
import { putScan } from '@/state/handoff';
import { usePro } from '@/state/ProProvider';
import { colors, fonts, radii, spacing, webNoOutline } from '@/theme';
import { confirm } from '@/utils/confirm';
import { newId } from '@/utils/id';

const VISIBLE = 40;

/** Prime: chat with the AI agent, which can suggest app actions that the user confirms or undoes. */
export default function PrimeScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ topic?: string }>();
  const { data, dispatch } = useAppState();
  const auth = useAuth();
  const pro = usePro();
  const prime = usePrime();
  const suggestions = t('prime.suggestions', { returnObjects: true }) as string[];
  const [text, setText] = useState(params.topic === 'plan' ? t('prime.planPrompt') : '');
  const [showAll, setShowAll] = useState(false);
  const signedOut = auth.configured && auth.status !== 'signedIn';
  const messages = showAll ? prime.messages : prime.messages.slice(-VISIBLE);

  const send = () => {
    const v = text;
    setText('');
    void prime.send(v);
  };
  const clear = async () => {
    if (!(await confirm({ title: t('prime.clear'), message: t('prime.clearBody'), confirmLabel: t('common.delete'), cancelLabel: t('common.cancel'), destructive: true }))) return;
    await dispatch({ type: 'clearCoach' });
  };

  const errorText = (e: AiError) => (e === 'free_limit' ? t('prime.freeLimit') : t(`ai.${e}` as 'ai.offline'));

  return (
    <Screen
      inTabs
      headerRight={
        <View style={styles.headerButtons}>
          <IconButton icon="bookmark-outline" label={t('prime.memory.title')} onPress={() => router.push('/memories')} variant="plain" />
          <IconButton icon="time-outline" label={t('prime.log.title')} onPress={() => router.push('/prime-log')} variant="plain" />
          {prime.messages.length ? <IconButton icon="trash-outline" label={t('prime.clear')} onPress={() => void clear()} variant="plain" /> : null}
        </View>
      }
      footer={
        <View style={styles.inputRow}>
          <IconButton icon="camera-outline" label={t('prime.photo')} onPress={() => router.push('/food-scan')} variant="plain" />
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={t('prime.placeholder')}
            placeholderTextColor={colors.textSecondary}
            style={[styles.input, webNoOutline]}
            multiline
            maxLength={1000}
            accessibilityLabel={t('prime.placeholder')}
            editable={!prime.busy}
          />
          <IconButton icon="arrow-up" label={t('coach.send')} onPress={send} variant="inverse" />
        </View>
      }>
      <View style={styles.hero}>
        <PrimeBadge size={56} ring={prime.busy ? colors.primary : undefined} />
        <View style={styles.flex}>
          <AppText variant="title" accessibilityRole="header">
            {t('brand.agent')}
          </AppText>
          <AppText variant="caption" color="secondary">
            {t('prime.subtitle')}
          </AppText>
        </View>
      </View>

      {!aiAvailable() ? (
        <Card>
          <AppText variant="bodyStrong">{t('prime.unavailable')}</AppText>
        </Card>
      ) : signedOut ? (
        <Card style={styles.gap}>
          <AppText variant="bodyStrong">{t('prime.signedOut')}</AppText>
          <Button label={t('auth.signIn')} size="sm" variant="secondary" fullWidth={false} onPress={() => router.push('/auth/sign-in')} />
        </Card>
      ) : null}

      {!data.coach.consentToContext ? (
        <Card style={styles.gap}>
          <AppText variant="bodyStrong">{t('prime.consent.title')}</AppText>
          <AppText variant="caption">{t('prime.consent.body')}</AppText>
          <Button label={t('prime.consent.allow')} size="sm" fullWidth={false} onPress={() => void dispatch({ type: 'setCoachConsent', value: true })} />
        </Card>
      ) : null}

      {prime.messages.length === 0 ? (
        <>
          <View style={[styles.bubble, styles.assistant]}>
            <AppText variant="body">{t('prime.hello', { name: data.profile?.name ?? '' })}</AppText>
          </View>
          <View style={styles.chips}>
            {suggestions.map((s) => (
              <Chip key={s} label={s} selected={false} onPress={() => setText(s)} />
            ))}
          </View>
        </>
      ) : null}

      {!showAll && prime.messages.length > VISIBLE ? <Button label={t('prime.older')} size="sm" variant="ghost" fullWidth={false} onPress={() => setShowAll(true)} /> : null}

      {messages.map((m) => (
        <View key={m.id} style={styles.gap}>
          <View style={[styles.bubble, m.role === 'user' ? styles.user : styles.assistant]}>
            <AppText variant="body" color={m.role === 'user' ? colors.white : colors.text} selectable>
              {m.content}
            </AppText>
          </View>
          {m.actions?.map((a, i) => (
            <ActionCard
              key={i}
              action={a}
              onApply={() => void prime.apply(m.id, i, a)}
              onDismiss={() => prime.dismiss(m.id, i)}
              onUndo={() => a.logId && void prime.undo(a.logId, m.id, i)}
              onEdit={
                a.type === 'log_meal'
                  ? () => {
                      putScan({ title: a.title, items: toFoodItems(a.items, newId) });
                      router.push({ pathname: '/food-entry', params: { fromScan: '1', mealType: a.mealType } });
                    }
                  : undefined
              }
            />
          ))}
        </View>
      ))}

      {prime.busy ? (
        <View style={[styles.bubble, styles.assistant]} accessibilityLiveRegion="polite">
          <AppText variant="body" color="secondary">
            {t('prime.thinking')}
          </AppText>
        </View>
      ) : null}

      {prime.error ? (
        <Card style={styles.gap}>
          <AppText variant="bodyStrong" accessibilityLiveRegion="polite">
            {errorText(prime.error)}
          </AppText>
          {prime.error === 'free_limit' && !pro.isPro ? <Button label={t('prime.upgrade')} size="sm" fullWidth={false} onPress={() => router.push('/pro')} /> : null}
          {prime.error !== 'free_limit' && prime.messages[prime.messages.length - 1]?.role === 'user' ? (
            <Button label={t('common.retry')} size="sm" variant="secondary" fullWidth={false} onPress={prime.retry} />
          ) : null}
        </Card>
      ) : null}

      <AppText variant="caption" color="secondary">
        {t('prime.safety')}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1, gap: 2 },
  headerButtons: { flexDirection: 'row' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs },
  input: { flex: 1, minHeight: 48, maxHeight: 120, borderRadius: radii.lg, backgroundColor: colors.card, paddingHorizontal: spacing.md, paddingVertical: 12, fontFamily: fonts.regular, fontSize: 16, color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  bubble: { maxWidth: '86%', borderRadius: radii.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  user: { alignSelf: 'flex-end', backgroundColor: colors.black },
  assistant: { alignSelf: 'flex-start', backgroundColor: colors.primarySoft },
  gap: { gap: spacing.sm },
});
