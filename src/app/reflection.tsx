import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Card, Chip, Icon, Screen, TextField } from '@/components/ui';
import { newId } from '@/domain/plan';
import type { Mood } from '@/domain/types';
import { useAppState } from '@/state/AppStateProvider';
import { spacing } from '@/theme';

const PROMPTS = ['p1', 'p2', 'p3', 'p4', 'p5'] as const;
const MOODS: Mood[] = [1, 2, 3, 4, 5];

export default function ReflectionScreen() {
  const { t } = useTranslation();
  const { today, dispatch } = useAppState();
  const [mood, setMood] = useState<Mood>(4);
  const [prompt, setPrompt] = useState(() => Math.floor(Math.random() * PROMPTS.length));
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const promptKey = `reflection.prompts.${PROMPTS[prompt]}` as const;

  const save = async () => {
    if (!body.trim()) {
      setError(t('reflection.empty'));
      return;
    }
    setSaving(true);
    try {
      await dispatch({ type: 'addReflection', reflection: { id: newId('r'), date: today, mood, promptKey, body: body.trim(), createdAt: new Date().toISOString() } });
      router.back();
    } catch {
      setError(t('states.saveError'));
      setSaving(false);
    }
  };

  return (
    <Screen back="close" title={t('reflection.title')} footer={<Button label={t('reflection.save')} onPress={save} loading={saving} />}>
      <View style={styles.group}>
        <AppText variant="subheading">{t('reflection.mood')}</AppText>
        <View style={styles.chips} accessibilityRole="radiogroup">
          {MOODS.map((m) => (
            <Chip key={m} mode="radio" label={t(`reflection.moods.${m}`)} selected={mood === m} onPress={() => setMood(m)} />
          ))}
        </View>
      </View>
      <Card style={styles.group}>
        <AppText variant="overline" color="secondary">
          {t('reflection.prompt')}
        </AppText>
        <AppText variant="heading">{t(promptKey)}</AppText>
        <Pressable onPress={() => setPrompt((p) => (p + 1) % PROMPTS.length)} accessibilityRole="button" hitSlop={8} style={styles.another}>
          <Icon name="refresh-cw" size={14} />
          <AppText variant="label">{t('reflection.another')}</AppText>
        </Pressable>
      </Card>
      <TextField
        label={t('reflection.label')}
        placeholder={t('reflection.placeholder')}
        value={body}
        onChangeText={(v) => {
          setBody(v);
          if (error) setError(null);
        }}
        multiline
        maxLength={3000}
        error={error ?? undefined}
        hint={t('reflection.private')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  another: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 32 },
});
