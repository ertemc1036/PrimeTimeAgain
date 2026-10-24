import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button, EmptyState, Screen, TextField } from '@/components/ui';
import { goalOutcome } from '@/i18n/content';
import { useAppState } from '@/state/AppStateProvider';
import { confirm } from '@/utils/confirm';

export default function GoalEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { data, dispatch } = useAppState();
  const goal = data.goals.find((g) => g.id === id);
  const [title, setTitle] = useState(goal?.title ?? '');
  const [startingPoint, setStartingPoint] = useState(goal?.startingPoint ?? '');
  const [desiredOutcome, setDesiredOutcome] = useState(goal?.desiredOutcome ?? '');

  if (!goal) {
    return (
      <Screen back="close">
        <EmptyState icon="target" title={t('notFound.title')} />
      </Screen>
    );
  }

  const save = async () => {
    await dispatch({
      type: 'upsertGoal',
      goal: { ...goal, title: goal.templateId ? goal.title : title.trim() || goal.title, startingPoint: startingPoint.trim(), desiredOutcome: desiredOutcome.trim() },
    }).catch(() => undefined);
    router.back();
  };

  const archive = async () => {
    const ok = await confirm({ title: t('goal.archiveTitle'), message: t('goal.archiveBody'), confirmLabel: t('goal.archive'), cancelLabel: t('common.cancel'), destructive: true });
    if (!ok) return;
    await dispatch({ type: 'archiveGoal', goalId: goal.id }).catch(() => undefined);
    router.dismissAll();
  };

  return (
    <Screen back="close" title={t('goal.edit')} footer={<Button label={t('common.save')} onPress={save} />}>
      {!goal.templateId ? <TextField label={t('goal.name')} value={title} onChangeText={setTitle} maxLength={60} /> : null}
      <TextField
        label={t('goal.startingPoint')}
        placeholder={t('goal.startingPlaceholder')}
        optional={t('common.optional')}
        value={startingPoint}
        onChangeText={setStartingPoint}
        multiline
        maxLength={300}
      />
      <TextField
        label={t('goal.outcome')}
        placeholder={goalOutcome(t, { ...goal, desiredOutcome: '' })}
        optional={t('common.optional')}
        value={desiredOutcome}
        onChangeText={setDesiredOutcome}
        multiline
        maxLength={300}
      />
      <Button label={t('goal.archive')} variant="ghost" icon="trash-2" size="md" onPress={archive} />
    </Screen>
  );
}
