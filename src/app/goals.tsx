import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Card, Chip, ListRow, Screen, SectionHeader, SelectCard, TextField } from '@/components/ui';
import { GOAL_TEMPLATES, MAX_GOALS } from '@/domain/catalog';
import { customGoal, goalFromTemplate, newId } from '@/domain/plan';
import { AREAS, type AreaId } from '@/domain/types';
import { goalTemplateTitle, goalTitle } from '@/i18n/content';
import { useAppState } from '@/state/AppStateProvider';
import { activeGoals } from '@/state/selectors';
import { spacing } from '@/theme';

/** Add, remove (archive) or create goals without resetting the program. */
export default function GoalsEditorScreen() {
  const { t } = useTranslation();
  const { data, dispatch } = useAppState();
  const [title, setTitle] = useState('');
  const [area, setArea] = useState<AreaId>('lifestyle');
  const goals = activeGoals(data.goals);
  const activeTemplates = new Set(goals.map((g) => g.templateId));
  const atMax = goals.length >= MAX_GOALS;

  const addTemplate = (id: (typeof GOAL_TEMPLATES)[number]['id']) => {
    const archived = data.goals.find((g) => g.templateId === id && g.archived);
    const goal = archived ? { ...archived, archived: false } : goalFromTemplate(id, new Date().toISOString(), newId('g'));
    void dispatch({ type: 'upsertGoal', goal }).catch(() => undefined);
  };

  const addCustom = () => {
    if (!title.trim()) return;
    void dispatch({ type: 'upsertGoal', goal: customGoal({ id: newId('g'), title, area }, new Date().toISOString()) }).catch(() => undefined);
    setTitle('');
  };

  return (
    <Screen back="back" title={t('goalsEditor.title')} subtitle={t('goalsEditor.subtitle')}>
      <SectionHeader title={t('goalsEditor.current')} />
      <Card padded={false}>
        {goals.map((g, i) => (
          <ListRow
            key={g.id}
            label={goalTitle(t, g)}
            value={t(`areas.${g.area}`)}
            onPress={() => router.push({ pathname: '/goal/[id]', params: { id: g.id } })}
            divider={i < goals.length - 1}
          />
        ))}
      </Card>
      <AppText variant="caption" color="secondary">
        {t('goalsEditor.note')}
      </AppText>

      <SectionHeader title={t('goalsEditor.add')} />
      <View style={styles.grid}>
        {GOAL_TEMPLATES.filter((g) => !activeTemplates.has(g.id)).map((g) => (
          <SelectCard key={g.id} layout="tile" glyph={g.icon} title={goalTemplateTitle(t, g.id)} badge={t(`areas.${g.area}`)} selected={false} disabled={atMax} onPress={() => addTemplate(g.id)} />
        ))}
      </View>

      <Card variant="outline" style={styles.custom}>
        <TextField label={t('onboarding.goals.customTitle')} placeholder={t('onboarding.goals.customPlaceholder')} value={title} onChangeText={setTitle} maxLength={60} />
        <AppText variant="label">{t('onboarding.goals.customArea')}</AppText>
        <View style={styles.chips}>
          {AREAS.map((a) => (
            <Chip key={a} mode="radio" label={t(`areas.${a}`)} selected={area === a} onPress={() => setArea(a)} />
          ))}
        </View>
        <Button label={t('onboarding.goals.customAdd')} icon="plus" size="md" disabled={!title.trim() || atMax} onPress={addCustom} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  custom: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
