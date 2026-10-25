import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Card, Chip, IconButton, Screen } from '@/components/ui';
import { coachContext } from '@/features/coachContext';
import { useSave } from '@/hooks/useSave';
import { aiAvailable, streamCoach, type AiError } from '@/services/ai/client';
import { useAppState } from '@/state/AppStateProvider';
import { useAuth } from '@/state/AuthProvider';
import { usePro } from '@/state/ProProvider';
import { colors, fonts, radii, spacing, webNoOutline } from '@/theme';
import { confirm } from '@/utils/confirm';
import { newId, nowISO } from '@/utils/id';

export default function Coach() {
  const { t } = useTranslation();
  const { topic } = useLocalSearchParams<{ topic?: string }>();
  const { data, today } = useAppState();
  const auth = useAuth();
  const { canOpenPro } = usePro();
  const save = useSave();
  const suggestions = t('coach.suggestions', { returnObjects: true }) as string[];
  const [text, setText] = useState(topic === 'plan' ? suggestions[0] : '');
  const [busy, setBusy] = useState(false);
  const [partial, setPartial] = useState('');
  const [error, setError] = useState<string | null>(null);
  const messages = data.coach.messages;

  if (!canOpenPro) return <Redirect href="/pro" />;

  const errorText: Record<AiError, string> = {
    not_configured: t('coach.unavailable'),
    signed_out: t('coach.signedOut'),
    not_pro: t('coach.notPro'),
    rate_limited: t('coach.rateLimited'),
    offline: t('coach.offline'),
    timeout: t('coach.failed'),
    invalid_response: t('coach.failed'),
    provider_error: t('coach.failed'),
  };

  const ask = async (history: { role: 'user' | 'assistant'; content: string }[]) => {
    setError(null);
    setBusy(true);
    setPartial('');
    const res = await streamCoach(history.slice(-12), coachContext(data, today), setPartial);
    setBusy(false);
    setPartial('');
    if (!res.ok) return setError(errorText[res.error]);
    await save({ type: 'addCoachMessage', message: { id: newId('cm'), role: 'assistant', content: res.data.reply.trim(), createdAt: nowISO() } });
  };

  const send = async (content: string) => {
    const msg = content.trim().slice(0, 1000);
    if (!msg || busy) return;
    setText('');
    const userMsg = { id: newId('cm'), role: 'user' as const, content: msg, createdAt: nowISO() };
    await save({ type: 'addCoachMessage', message: userMsg });
    await ask([...messages, userMsg].map((m) => ({ role: m.role, content: m.content })));
  };
  const retry = () => void ask(messages.map((m) => ({ role: m.role, content: m.content })));

  const clear = async () => {
    if (!(await confirm({ title: t('coach.clear'), message: t('privacy.confirmBody'), confirmLabel: t('common.delete'), cancelLabel: t('common.cancel'), destructive: true }))) return;
    await save({ type: 'clearCoach' });
  };

  const signedOut = auth.configured && auth.status !== 'signedIn';

  return (
    <Screen
      back="back"
      title={t('coach.title')}
      subtitle={t('coach.subtitle')}
      headerRight={messages.length ? <IconButton icon="trash-outline" label={t('coach.clear')} onPress={() => void clear()} variant="plain" /> : undefined}
      footer={
        <View style={styles.inputRow}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={t('coach.placeholder')}
            placeholderTextColor={colors.textSecondary}
            style={[styles.input, webNoOutline]}
            multiline
            maxLength={1000}
            accessibilityLabel={t('coach.placeholder')}
            editable={!busy}
          />
          <IconButton icon="arrow-up" label={t('coach.send')} onPress={() => void send(text)} variant="inverse" />
        </View>
      }>
      {!aiAvailable() ? (
        <Card>
          <AppText variant="bodyStrong">{t('coach.unavailable')}</AppText>
        </Card>
      ) : signedOut ? (
        <Card style={styles.gap}>
          <AppText variant="bodyStrong">{t('coach.signedOut')}</AppText>
          <Button label={t('auth.signIn')} size="sm" variant="secondary" fullWidth={false} onPress={() => router.push('/auth/sign-in')} />
        </Card>
      ) : null}
      <AppText variant="caption" color="secondary">
        {t('coach.safety')} {t('coach.consentNote')}
      </AppText>
      {messages.length === 0 ? (
        <View style={styles.chips}>
          {suggestions.map((s) => (
            <Chip key={s} label={s} selected={false} onPress={() => setText(s)} />
          ))}
        </View>
      ) : null}
      {messages.map((m) => (
        <View key={m.id} style={[styles.bubble, m.role === 'user' ? styles.user : styles.assistant]}>
          <AppText variant="body" color={m.role === 'user' ? colors.white : colors.text} selectable>
            {m.content}
          </AppText>
        </View>
      ))}
      {busy ? (
        <View style={[styles.bubble, styles.assistant]} accessibilityLiveRegion="polite">
          <AppText variant="body" color={partial ? colors.text : 'secondary'}>
            {partial || t('coach.thinking')}
          </AppText>
        </View>
      ) : null}
      {error ? (
        <Card style={styles.gap}>
          <AppText variant="bodyStrong" accessibilityLiveRegion="polite">
            {error}
          </AppText>
          {messages[messages.length - 1]?.role === 'user' ? <Button label={t('common.retry')} size="sm" variant="secondary" fullWidth={false} onPress={retry} /> : null}
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.xs },
  input: { flex: 1, minHeight: 48, maxHeight: 120, borderRadius: radii.lg, backgroundColor: colors.card, paddingHorizontal: spacing.md, paddingVertical: 12, fontFamily: fonts.regular, fontSize: 16, color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  bubble: { maxWidth: '86%', borderRadius: radii.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  user: { alignSelf: 'flex-end', backgroundColor: colors.black },
  assistant: { alignSelf: 'flex-start', backgroundColor: colors.card },
  gap: { gap: spacing.sm },
});
