import { Redirect, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Card, Chip, IconButton, Screen } from '@/components/ui';
import { dayChecks } from '@/domain/completion';
import { addDays } from '@/domain/dates';
import { useSave } from '@/hooks/useSave';
import { askCoach, aiAvailable, type AiError } from '@/services/ai/client';
import { useAppState } from '@/state/AppStateProvider';
import { usePro } from '@/state/ProProvider';
import { colors, fonts, radii, spacing, webNoOutline } from '@/theme';
import { confirm } from '@/utils/confirm';
import { newId, nowISO } from '@/utils/id';

export default function Coach() {
  const { t } = useTranslation();
  const { topic } = useLocalSearchParams<{ topic?: string }>();
  const { data, today } = useAppState();
  const { canOpenPro } = usePro();
  const save = useSave();
  const [text, setText] = useState(topic === 'plan' ? (t('coach.suggestions', { returnObjects: true }) as string[])[0] : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messages = data.coach.messages;
  const available = aiAvailable();

  if (!canOpenPro) return <Redirect href="/pro" />;

  // Context is only shared with explicit consent, and only a small recent summary.
  const context = () => {
    if (!data.coach.consentToContext) return null;
    const p = data.profile;
    return {
      preferences: p ? { goals: p.goals, activity: p.activityPrefs, food: p.food } : null,
      today: dayChecks(data, today),
      tomorrowPlan: data.plans[addDays(today, 1)] ?? null,
      recentMeals: data.foodLogs.filter((f) => f.date >= addDays(today, -2)).map((f) => ({ date: f.date, meal: f.mealType, title: f.title })),
      recentActivity: data.activityLogs.filter((a) => a.date >= addDays(today, -6)).map((a) => ({ date: a.date, type: a.type, minutes: a.durationMin })),
    };
  };

  const ask = async (history: { role: 'user' | 'assistant'; content: string }[]) => {
    setError(null);
    setBusy(true);
    const res = await askCoach(history.slice(-12), context());
    setBusy(false);
    if (!res.ok) {
      const key: Record<AiError, string> = {
        not_configured: t('coach.unavailable'),
        signed_out: t('coach.signedOut'),
        not_pro: t('coach.notPro'),
        rate_limited: t('coach.rateLimited'),
        offline: t('coach.offline'),
        invalid_response: t('coach.failed'),
        provider_error: t('coach.failed'),
      };
      setError(key[res.error]);
      return;
    }
    await save({ type: 'addCoachMessage', message: { id: newId('cm'), role: 'assistant', content: res.data.reply, createdAt: nowISO() } });
  };

  const send = async (content: string) => {
    const msg = content.trim().slice(0, 1000);
    if (!msg || busy) return;
    setText('');
    const userMsg = { id: newId('cm'), role: 'user' as const, content: msg, createdAt: nowISO() };
    await save({ type: 'addCoachMessage', message: userMsg });
    await ask([...messages, userMsg].map((m) => ({ role: m.role, content: m.content })));
  };

  // Retry the last question without adding it again.
  const retry = () => void ask(messages.map((m) => ({ role: m.role, content: m.content })));

  const clear = async () => {
    if (!(await confirm({ title: t('coach.clear'), message: t('privacy.confirmBody'), confirmLabel: t('common.delete'), cancelLabel: t('common.cancel'), destructive: true }))) return;
    await save({ type: 'clearCoach' });
  };

  const suggestions = t('coach.suggestions', { returnObjects: true }) as string[];

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
          />
          <IconButton icon="arrow-up" label={t('coach.send')} onPress={() => void send(text)} variant="inverse" />
        </View>
      }>
      {!available ? (
        <Card>
          <AppText variant="bodyStrong">{t('coach.unavailable')}</AppText>
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
          <AppText variant="body" color={m.role === 'user' ? colors.white : colors.text}>
            {m.content}
          </AppText>
        </View>
      ))}
      {busy ? (
        <AppText variant="caption" color="secondary">
          {t('coach.thinking')}
        </AppText>
      ) : null}
      {error ? (
        <Card>
          <AppText variant="bodyStrong" accessibilityLiveRegion="polite">
            {error}
          </AppText>
          <Button label={t('common.retry')} size="sm" variant="secondary" fullWidth={false} onPress={retry} />
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
});
