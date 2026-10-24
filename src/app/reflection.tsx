import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { moodColors } from '@/components/progress/ReflectionCard';
import { AppText, Banner, Button, Card, Icon, Screen, TextField } from '@/components/ui';
import type { Mood } from '@/domain/types';
import { useAppState } from '@/state/AppStateProvider';
import { colors, layout, radii, spacing } from '@/theme';

const PROMPTS = ['p1', 'p2', 'p3', 'p4', 'p5'] as const;
const MOODS: Mood[] = [1, 2, 3, 4, 5];

export default function ReflectionScreen() {
  const { t } = useTranslation();
  const { today, addReflection } = useAppState();
  const [mood, setMood] = useState<Mood>(4);
  const [prompt, setPrompt] = useState(() => Math.floor(Math.random() * PROMPTS.length));
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const promptKey = `reflection.prompts.${PROMPTS[prompt]}` as const;

  const save = async () => {
    if (!body.trim()) {
      setError(t('reflection.errorEmpty'));
      return;
    }
    setSaving(true);
    try {
      await addReflection({ date: today, mood, promptKey, body: body.trim() });
      router.back();
    } catch {
      setError(t('states.saveError'));
      setSaving(false);
    }
  };

  return (
    <Screen
      back="close"
      title={t('reflection.title')}
      footer={<Button label={t('reflection.save')} icon="check" onPress={save} loading={saving} />}>
      <View style={styles.group}>
        <AppText variant="subheading">{t('reflection.moodQuestion')}</AppText>
        <View style={styles.moods} accessibilityRole="radiogroup">
          {MOODS.map((m) => {
            const selected = m === mood;
            return (
              <Pressable
                key={m}
                onPress={() => setMood(m)}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={t(`reflection.moods.${m}`)}
                style={[styles.mood, { backgroundColor: moodColors[m] }, selected && styles.moodSelected]}>
                <AppText variant="label" align="center" numberOfLines={2}>
                  {t(`reflection.moods.${m}`)}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Card tint={colors.surfaceAlt} elevated={false} style={styles.prompt}>
        <AppText variant="overline" color={colors.primaryText}>
          {t('reflection.promptTitle')}
        </AppText>
        <AppText variant="heading">{t(promptKey)}</AppText>
        <Pressable
          onPress={() => setPrompt((p) => (p + 1) % PROMPTS.length)}
          accessibilityRole="button"
          hitSlop={8}
          style={styles.shuffle}>
          <Icon name="refresh-cw" size={14} color={colors.primaryText} />
          <AppText variant="label" color={colors.primaryText}>
            {t('reflection.otherPrompt')}
          </AppText>
        </Pressable>
      </Card>

      {error && error !== t('reflection.errorEmpty') ? <Banner message={error} onDismiss={() => setError(null)} /> : null}

      <TextField
        label={t('reflection.label')}
        placeholder={t('reflection.placeholder')}
        value={body}
        onChangeText={(v) => {
          setBody(v);
          if (error) setError(null);
        }}
        multiline
        maxLength={2000}
        error={error === t('reflection.errorEmpty') ? error : undefined}
        hint={t('reflection.privacyNote')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  moods: { flexDirection: 'row', gap: spacing.xs },
  mood: {
    flex: 1,
    minHeight: layout.minTouchTarget + 4,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxs,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  moodSelected: { borderColor: colors.primary },
  prompt: { gap: spacing.xs },
  shuffle: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, marginTop: spacing.xxs },
});
