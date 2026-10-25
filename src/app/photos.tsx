import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Card, Screen } from '@/components/ui';
import { formatDate } from '@/i18n/format';
import { useLocale } from '@/i18n/useLanguage';
import { useSave } from '@/hooks/useSave';
import { deletePrivate, pickPhoto, storePrivately } from '@/services/photos';
import { useAppState } from '@/state/AppStateProvider';
import { colors, radii, spacing } from '@/theme';
import { confirm } from '@/utils/confirm';
import { newId, nowISO } from '@/utils/id';

export default function Photos() {
  const { t } = useTranslation();
  const locale = useLocale();
  const { data, today } = useAppState();
  const save = useSave();
  const [error, setError] = useState<string | null>(null);

  const add = async () => {
    const res = await pickPhoto('library', 1440);
    if (!res.ok) {
      if (res.reason !== 'cancelled') setError(t('photos.permission'));
      return;
    }
    const id = newId('photo');
    const uri = await storePrivately(res.uri, id);
    await save({ type: 'addPhoto', photo: { id, date: today, uri, createdAt: nowISO() } });
  };

  const remove = async (id: string, uri: string) => {
    if (!(await confirm({ title: t('photos.deleteTitle'), message: t('photos.deleteBody'), confirmLabel: t('common.delete'), cancelLabel: t('common.cancel'), destructive: true }))) return;
    deletePrivate(uri);
    await save({ type: 'deletePhoto', id });
  };

  const photos = [...data.photos].reverse();
  return (
    <Screen back="back" title={t('photos.title')} subtitle={t('photos.subtitle')} footer={<Button label={t('photos.add')} icon="add" onPress={() => void add()} />}>
      {error ? <AppText variant="bodyStrong">{error}</AppText> : null}
      {photos.length === 0 ? (
        <Card>
          <AppText variant="body" color="secondary">
            {t('photos.none')}
          </AppText>
        </Card>
      ) : (
        <View style={styles.grid}>
          {photos.map((p) => (
            <Pressable key={p.id} style={styles.cell} onLongPress={() => void remove(p.id, p.uri)} accessibilityLabel={`${formatDate(p.date, locale, { day: 'numeric', month: 'short' })}. ${t('photos.delete')}`} accessibilityHint={t('photos.delete')}>
              <Image source={{ uri: p.uri }} style={styles.img} contentFit="cover" />
              <AppText variant="label" color="secondary">
                {formatDate(p.date, locale, { day: 'numeric', month: 'short', year: 'numeric' })}
              </AppText>
              <Button label={t('common.delete')} size="sm" variant="ghost" onPress={() => void remove(p.id, p.uri)} />
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cell: { width: '48%', gap: 4 },
  img: { width: '100%', aspectRatio: 3 / 4, borderRadius: radii.md, backgroundColor: colors.card },
});
