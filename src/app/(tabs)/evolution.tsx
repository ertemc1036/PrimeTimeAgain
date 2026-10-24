import { router } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ReflectionCard } from '@/components/evolution/ReflectionCard';
import { Sparkline } from '@/components/evolution/Sparkline';
import { toDisplay, unitFor } from '@/components/evolution/units';
import { AppText, Banner, Button, Card, Icon, PressableScale, Screen, SectionHeader } from '@/components/ui';
import { ACHIEVEMENTS, unlockedAchievements } from '@/domain/achievements';
import { startOfWeek } from '@/domain/dates';
import { newId } from '@/domain/plan';
import type { MetricId } from '@/domain/types';
import { formatDate } from '@/i18n/format';
import { useLanguage } from '@/i18n/useLanguage';
import { deleteProgressPhoto, importProgressPhoto } from '@/services/photos';
import { useAppState } from '@/state/AppStateProvider';
import { radii, spacing, status, useColors } from '@/theme';
import { confirm } from '@/utils/confirm';

const SCALE = Array.from({ length: 10 }, (_, i) => i + 1);

export default function EvolutionScreen() {
  const { t } = useTranslation();
  const { code } = useLanguage();
  const colors = useColors();
  const { data, today, dispatch } = useAppState();
  const [note, setNote] = useState<string | null>(null);
  const units = data.preferences.units;
  const series = (metric: MetricId) => data.measurements.filter((m) => m.metric === metric).sort((a, b) => (a.date < b.date ? -1 : 1));
  const unlocked = unlockedAchievements(data, today);
  const photos = [...data.photos].sort((a, b) => (a.date < b.date ? -1 : 1));

  const checkIn = async (metric: 'confidence' | 'energy', value: number) => {
    const week = startOfWeek(today);
    const existing = data.measurements.find((m) => m.metric === metric && startOfWeek(m.date) === week);
    if (existing) await dispatch({ type: 'deleteMeasurement', id: existing.id }).catch(() => undefined);
    await dispatch({ type: 'addMeasurement', measurement: { id: newId('m'), date: today, metric, value, createdAt: new Date().toISOString() } }).catch(() =>
      setNote(t('states.saveError')),
    );
  };

  const addPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: [3, 4] });
      if (result.canceled || !result.assets[0]) return;
      const uri = await importProgressPhoto(result.assets[0].uri);
      await dispatch({ type: 'addPhoto', photo: { id: newId('p'), date: today, uri, createdAt: new Date().toISOString() } });
    } catch {
      setNote(t('evolution.photoPermission'));
    }
  };

  const removePhoto = async (id: string, uri: string) => {
    const ok = await confirm({ title: t('evolution.deletePhoto'), message: t('evolution.deletePhotoBody'), confirmLabel: t('common.delete'), cancelLabel: t('common.cancel'), destructive: true });
    if (!ok) return;
    await dispatch({ type: 'deletePhoto', id }).catch(() => undefined);
    await deleteProgressPhoto(uri);
  };

  return (
    <Screen inTabs title={t('evolution.title')} subtitle={t('evolution.subtitle')}>
      {note ? <Banner tone="info" message={note} onDismiss={() => setNote(null)} /> : null}

      <SectionHeader title={t('evolution.checkin')} />
      <Card style={styles.card}>
        <AppText variant="caption" color="secondary">
          {t('evolution.checkinBody')}
        </AppText>
        {(['confidence', 'energy'] as const).map((metric) => {
          const s = series(metric);
          const current = s.find((m) => startOfWeek(m.date) === startOfWeek(today));
          return (
            <View key={metric} style={styles.checkin}>
              <View style={styles.checkinHead}>
                <AppText variant="subheading" style={styles.flex}>
                  {t(`evolution.${metric}`)}
                </AppText>
                <Sparkline values={s.map((m) => m.value)} width={90} height={28} />
              </View>
              <View style={styles.scale} accessibilityRole="radiogroup" accessibilityLabel={t(`evolution.${metric}`)}>
                {SCALE.map((n) => {
                  const selected = current?.value === n;
                  return (
                    <PressableScale
                      key={n}
                      onPress={() => void checkIn(metric, n)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      accessibilityLabel={`${t(`evolution.${metric}`)} ${n}`}
                      style={[styles.dot, { backgroundColor: selected ? colors.accent : colors.background }]}>
                      <AppText variant="label" color={selected ? colors.onAccent : undefined}>
                        {String(n)}
                      </AppText>
                    </PressableScale>
                  );
                })}
              </View>
            </View>
          );
        })}
      </Card>

      <SectionHeader title={t('evolution.measurements')} action={t('evolution.addMeasurement')} onAction={() => router.push('/measurement')} />
      <Card style={styles.card}>
        <AppText variant="caption" color="secondary">
          {t('evolution.measurementsBody')}
        </AppText>
        {(['weight', 'waist'] as const).map((metric) => {
          const s = series(metric);
          const unit = t(`metric.${unitFor(metric, units)}` as 'metric.kg');
          if (s.length === 0) return null;
          const first = toDisplay(metric, s[0].value, units);
          const last = toDisplay(metric, s[s.length - 1].value, units);
          const diff = Math.round((last - first) * 10) / 10;
          return (
            <View key={metric} style={styles.measure} accessible accessibilityLabel={`${t(`evolution.${metric}`)}: ${last} ${unit}`}>
              <View style={styles.flex}>
                <AppText variant="label" color="secondary">
                  {t(`evolution.${metric}`)}
                </AppText>
                <AppText variant="title">{`${last} ${unit}`}</AppText>
                {s.length > 1 ? (
                  <AppText variant="caption" color="secondary">
                    {t('evolution.change', { value: `${diff > 0 ? '+' : ''}${diff} ${unit}` })}
                  </AppText>
                ) : null}
              </View>
              <Sparkline values={s.map((m) => m.value)} />
            </View>
          );
        })}
        {series('weight').length + series('waist').length === 0 ? (
          <AppText variant="body" color="secondary">
            {t('evolution.noMeasurements')}
          </AppText>
        ) : null}
      </Card>

      <SectionHeader title={t('evolution.journal')} action={t('evolution.newEntry')} onAction={() => router.push('/reflection')} />
      {data.reflections.length === 0 ? (
        <Card>
          <AppText variant="body" color="secondary">
            {t('evolution.noEntries')}
          </AppText>
        </Card>
      ) : (
        data.reflections.slice(0, 5).map((r) => <ReflectionCard key={r.id} reflection={r} />)
      )}

      <SectionHeader title={t('evolution.photos')} action={t('evolution.addPhoto')} onAction={() => void addPhoto()} />
      <Card style={styles.card}>
        <View style={styles.privacy}>
          <Icon name="lock" size={14} color={colors.textSecondary} />
          <AppText variant="caption" color="secondary" style={styles.flex}>
            {t('evolution.photosBody')}
          </AppText>
        </View>
        {photos.length === 0 ? (
          <Button label={t('evolution.addPhoto')} icon="image" variant="secondary" size="md" onPress={() => void addPhoto()} />
        ) : (
          <>
            {photos.length > 1 ? (
              <>
                <AppText variant="overline" color="secondary">
                  {t('evolution.compare')}
                </AppText>
                <View style={styles.compare}>
                  {[photos[0], photos[photos.length - 1]].map((p) => (
                    <View key={p.id} style={styles.compareItem}>
                      <Image source={{ uri: p.uri }} style={styles.compareImg} contentFit="cover" accessible={false} />
                      <AppText variant="label" color="secondary" align="center">
                        {formatDate(p.date, code, { day: 'numeric', month: 'short' })}
                      </AppText>
                    </View>
                  ))}
                </View>
              </>
            ) : null}
            <View style={styles.photos}>
              {photos.map((p) => (
                <PressableScale
                  key={p.id}
                  onPress={() => void removePhoto(p.id, p.uri)}
                  accessibilityRole="button"
                  accessibilityLabel={`${t('evolution.deletePhoto')}, ${formatDate(p.date, code, { day: 'numeric', month: 'long' })}`}
                  style={styles.photo}>
                  <Image source={{ uri: p.uri }} style={styles.photoImg} contentFit="cover" accessible={false} />
                </PressableScale>
              ))}
            </View>
          </>
        )}
      </Card>

      <SectionHeader title={t('evolution.achievements')} />
      <View style={styles.achievements}>
        {ACHIEVEMENTS.map((a) => {
          const got = unlocked.has(a);
          return (
            <View
              key={a}
              style={[styles.achievement, { backgroundColor: got ? colors.accent : colors.surface }]}
              accessible
              accessibilityLabel={`${t(`evolution.achievement.${a}`)}${got ? '' : `, ${t('evolution.locked')}`}`}>
              <Icon name={got ? 'award' : 'lock'} size={18} color={got ? status.prime : colors.textSecondary} />
              <AppText variant="label" color={got ? colors.onAccent : 'secondary'}>
                {t(`evolution.achievement.${a}`)}
              </AppText>
            </View>
          );
        })}
      </View>

      <Card variant="outline" style={styles.card}>
        <View style={styles.filmHead}>
          <Icon name="film" size={18} />
          <AppText variant="subheading" style={styles.flex}>
            {t('evolution.film')}
          </AppText>
          <AppText variant="overline" color="secondary">
            {t('common.comingSoon')}
          </AppText>
        </View>
        <AppText variant="caption" color="secondary">
          {t('evolution.filmBody')}
        </AppText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { gap: spacing.sm },
  checkin: { gap: spacing.xs, marginTop: spacing.xs },
  checkinHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  scale: { flexDirection: 'row', gap: 4 },
  dot: { flex: 1, minWidth: 0, height: 40, borderRadius: radii.xs, alignItems: 'center', justifyContent: 'center' },
  measure: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xs },
  privacy: { flexDirection: 'row', gap: spacing.xs, alignItems: 'flex-start' },
  compare: { flexDirection: 'row', gap: spacing.xs },
  compareItem: { flex: 1, gap: 4 },
  compareImg: { width: '100%', aspectRatio: 3 / 4, borderRadius: radii.sm, backgroundColor: '#202126' },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  photo: { width: 72, height: 96, borderRadius: radii.xs, overflow: 'hidden' },
  photoImg: { width: '100%', height: '100%' },
  achievements: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  achievement: { flexBasis: '47%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, padding: spacing.sm, borderRadius: radii.sm, minHeight: 52 },
  filmHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
