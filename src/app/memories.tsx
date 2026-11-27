import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Card, Chip, IconButton, Screen, TextField } from '@/components/ui';
import { MEMORY_CATEGORIES, type MemoryCategory, type PrimeMemory } from '@/domain/types';
import { useAppState } from '@/state/AppStateProvider';
import { usePro } from '@/state/ProProvider';
import { spacing } from '@/theme';
import { confirm } from '@/utils/confirm';
import { newId, nowISO } from '@/utils/id';

/**
 * Prime Memory: what Prime knows about the user. Only entries the user confirmed or added; each can
 * be edited or deleted, and everything can be deleted at once. Chats are not memory.
 */
export default function Memories() {
  const { t } = useTranslation();
  const { data, dispatch } = useAppState();
  const pro = usePro();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [category, setCategory] = useState<MemoryCategory>('goal');
  const [newText, setNewText] = useState('');
  const grouped = MEMORY_CATEGORIES.map((c) => ({ c, items: data.memories.filter((m) => m.category === c) })).filter((g) => g.items.length);

  const save = async (m: PrimeMemory) => {
    const text = draft.trim().slice(0, 300);
    if (!text) return;
    const r = await dispatch({ type: 'upsertMemory', memory: { ...m, text, updatedAt: nowISO() } });
    if (r.ok) setEditing(null);
  };
  const remove = async (m: PrimeMemory) => {
    if (!(await confirm({ title: t('prime.memory.delete'), message: m.text, confirmLabel: t('common.delete'), cancelLabel: t('common.cancel'), destructive: true }))) return;
    await dispatch({ type: 'deleteMemory', id: m.id });
  };
  const add = async () => {
    const text = newText.trim().slice(0, 300);
    if (text.length < 3) return;
    const r = await dispatch({ type: 'upsertMemory', memory: { id: newId('mem'), category, text, createdAt: nowISO(), updatedAt: nowISO() } });
    if (r.ok) setNewText('');
  };
  const removeAll = async () => {
    if (!(await confirm({ title: t('prime.memory.deleteAll'), message: t('prime.memory.deleteAllBody'), confirmLabel: t('common.delete'), cancelLabel: t('common.cancel'), destructive: true }))) return;
    await dispatch({ type: 'deleteAllMemories' });
  };

  return (
    <Screen back="back" title={t('prime.memory.title')} subtitle={t('prime.memory.subtitle')}>
      {pro.showPaywalls ? (
        <Card>
          <AppText variant="caption">{t('prime.memory.plusOnly')}</AppText>
        </Card>
      ) : null}
      {!data.coach.consentToContext ? (
        <Card>
          <AppText variant="caption">{t('prime.memory.noConsent')}</AppText>
        </Card>
      ) : null}
      {grouped.length === 0 ? (
        <AppText variant="body" color="secondary">
          {t('prime.memory.empty')}
        </AppText>
      ) : null}
      {grouped.map((g) => (
        <View key={g.c} style={styles.section}>
          <AppText variant="overline" color="secondary">
            {t(`prime.memory.category.${g.c}` as 'prime.memory.category.goal')}
          </AppText>
          {g.items.map((m) => (
            <Card key={m.id} style={styles.item}>
              {editing === m.id ? (
                <View style={styles.flex}>
                  <TextField label={t('prime.memory.text')} value={draft} onChangeText={setDraft} maxLength={300} multiline />
                  <View style={styles.row}>
                    <Button label={t('common.save')} size="sm" fullWidth={false} onPress={() => void save(m)} />
                    <Button label={t('common.cancel')} size="sm" variant="ghost" fullWidth={false} onPress={() => setEditing(null)} />
                  </View>
                </View>
              ) : (
                <>
                  <AppText variant="body" style={styles.flex}>
                    {m.text}
                  </AppText>
                  <IconButton
                    icon="create-outline"
                    label={t('prime.memory.edit')}
                    variant="plain"
                    onPress={() => {
                      setDraft(m.text);
                      setEditing(m.id);
                    }}
                  />
                  <IconButton icon="trash-outline" label={t('prime.memory.delete')} variant="plain" onPress={() => void remove(m)} />
                </>
              )}
            </Card>
          ))}
        </View>
      ))}
      <Card style={styles.section}>
        <AppText variant="bodyStrong">{t('prime.memory.add')}</AppText>
        <View style={styles.chips}>
          {MEMORY_CATEGORIES.map((c) => (
            <Chip key={c} label={t(`prime.memory.category.${c}` as 'prime.memory.category.goal')} selected={category === c} onPress={() => setCategory(c)} />
          ))}
        </View>
        <TextField label={t('prime.memory.text')} value={newText} onChangeText={setNewText} maxLength={300} multiline />
        <Button label={t('prime.memory.addButton')} size="sm" fullWidth={false} onPress={() => void add()} disabled={newText.trim().length < 3} />
      </Card>
      {data.memories.length ? <Button label={t('prime.memory.deleteAll')} variant="ghost" onPress={() => void removeAll()} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.xs },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  flex: { flex: 1, gap: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
