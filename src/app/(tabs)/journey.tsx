import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Card, Icon, ListRow, ProgressBar, Screen, Segmented, StatTile } from '@/components/ui';
import { MILESTONES } from '@/domain/achievements';
import { journeyStats } from '@/domain/completion';
import { addDays } from '@/domain/dates';
import { journeyPosition, MONTH_KEYS } from '@/domain/journey';
import { WeightChart } from '@/features/WeightChart';
import { formatWeight } from '@/features/units';
import { useSave } from '@/hooks/useSave';
import { formatDate } from '@/i18n/format';
import { useLocale } from '@/i18n/useLanguage';
import { useAppState } from '@/state/AppStateProvider';
import { colors, spacing } from '@/theme';

type Range = 'week' | 'month' | 'all';

export default function JourneyTab() {
  const { t } = useTranslation();
  const locale = useLocale();
  const { data, today } = useAppState();
  const save = useSave();
  const [range, setRange] = useState<Range>('month');
  const stats = journeyStats(data, today);
  const units = data.profile?.units ?? 'metric';
  const fmt = (kg: number) => formatWeight(kg, units);

  const since = range === 'week' ? addDays(today, -6) : range === 'month' ? addDays(today, -29) : '0000-00-00';
  const weights = data.weights.filter((w) => w.date >= since);
  const first = data.weights[0];
  const last = data.weights[data.weights.length - 1];
  const change = first && last && first !== last ? last.kg - first.kg : null;

  const j = data.journey;
  const pos = j.programEnabled && j.startDate ? journeyPosition(j.startDate, today) : null;
  const earned = new Set(data.achievements.map((a) => a.id));

  return (
    <Screen inTabs title={t('journey.title')} subtitle={t('journey.subtitle')}>
      <View style={styles.grid}>
        <StatTile value={String(stats.current)} label={t('journey.currentStreak')} />
        <StatTile value={String(stats.longest)} label={t('journey.longestStreak')} />
        <StatTile value={String(stats.completedDays)} label={t('journey.completedDays')} />
      </View>
      <View style={styles.grid}>
        <StatTile value={String(stats.workouts)} label={t('journey.workouts')} />
        <StatTile value={String(stats.recoveryDays)} label={t('journey.recoveryDays')} />
        <StatTile value={String(stats.mealsLogged)} label={t('journey.meals')} />
      </View>
      <Card style={styles.gap}>
        <View style={styles.between}>
          <AppText variant="bodyStrong">{t('journey.foodConsistency')}</AppText>
          <AppText variant="bodyStrong">{stats.foodConsistency === null ? '—' : `${stats.foodConsistency}%`}</AppText>
        </View>
        <ProgressBar progress={(stats.foodConsistency ?? 0) / 100} />
      </Card>

      <View style={styles.between}>
        <AppText variant="heading">{t('journey.weight')}</AppText>
        <Button label={t('journey.addWeight')} icon="add" size="sm" variant="secondary" fullWidth={false} onPress={() => router.push('/weight')} />
      </View>
      {data.weights.length === 0 ? (
        <Card>
          <AppText variant="body" color="secondary">
            {t('journey.noWeight')}
          </AppText>
        </Card>
      ) : (
        <Card style={styles.gap}>
          <View style={styles.between}>
            <AppText variant="stat">{fmt(last.kg)}</AppText>
            {change !== null ? (
              <AppText variant="label" color="secondary">
                {t('journey.weightChange', { value: `${change > 0 ? '+' : change < 0 ? '−' : ''}${fmt(Math.abs(change))}` })}
              </AppText>
            ) : null}
          </View>
          <Segmented
            value={range}
            options={[
              { value: 'week', label: t('journey.week') },
              { value: 'month', label: t('journey.month') },
              { value: 'all', label: t('journey.all') },
            ]}
            onChange={setRange}
          />
          <WeightChart entries={weights} format={fmt} today={today} label={t('journey.weight')} />
          <AppText variant="caption" color="secondary">
            {t('journey.weightNote')}
          </AppText>
          <View>
            {[...data.weights]
              .reverse()
              .slice(0, 5)
              .map((w, i, arr) => (
                <ListRow
                  key={w.id}
                  label={formatDate(w.date, locale, { day: 'numeric', month: 'short', year: 'numeric' })}
                  value={fmt(w.kg)}
                  onPress={() => router.push({ pathname: '/weight', params: { id: w.id } })}
                  divider={i < arr.length - 1}
                />
              ))}
          </View>
        </Card>
      )}

      <AppText variant="heading">{t('journey.program')}</AppText>
      {pos ? (
        <Card style={styles.gap}>
          {pos.finished ? (
            <>
              <AppText variant="bodyStrong">{t('journey.finished')}</AppText>
              {!j.maintenance ? <Button label={t('journey.maintenanceStart')} onPress={() => void save({ type: 'updateJourney', patch: { maintenance: true } })} /> : null}
            </>
          ) : (
            <>
              <View style={styles.between}>
                <AppText variant="label" color="secondary">
                  {t('journey.programMonth', { month: pos.month })}
                </AppText>
                <AppText variant="label" color="secondary">
                  {t('journey.programDay', { day: pos.dayNumber })}
                </AppText>
              </View>
              <AppText variant="heading">{t(`journey.months.${MONTH_KEYS[pos.month - 1]}.title`)}</AppText>
              <AppText variant="body" color="secondary">
                {t(`journey.months.${MONTH_KEYS[pos.month - 1]}.body`)}
              </AppText>
              <ProgressBar progress={pos.progress} />
              <View style={styles.months}>
                {MONTH_KEYS.map((k, i) => (
                  <View key={k} style={[styles.month, i + 1 < pos.month && styles.monthDone, i + 1 === pos.month && styles.monthNow]}>
                    <AppText variant="label" color={i + 1 < pos.month ? colors.white : colors.text}>
                      {i + 1}
                    </AppText>
                  </View>
                ))}
              </View>
            </>
          )}
          <Button label={t('journey.programEnd')} variant="ghost" size="sm" onPress={() => void save({ type: 'updateJourney', patch: { programEnabled: false } })} />
        </Card>
      ) : (
        <Card style={styles.gap}>
          <AppText variant="body" color="secondary">
            {t('journey.programOff')}
          </AppText>
          <Button label={t('journey.programStart')} variant="secondary" onPress={() => void save({ type: 'updateJourney', patch: { programEnabled: true, startDate: today, maintenance: false } })} />
        </Card>
      )}
      {j.maintenance ? (
        <Card variant="inverse">
          <AppText variant="bodyStrong" color={colors.white}>
            {t('journey.maintenance')}
          </AppText>
          <AppText variant="caption" color="#BDBDBD">
            {t('journey.maintenanceOn')}
          </AppText>
        </Card>
      ) : null}

      <AppText variant="heading">{t('journey.milestones')}</AppText>
      <Card variant="outline" padded={false}>
        {MILESTONES.map((m, i) => (
          <View key={m.id} style={[styles.milestone, i < MILESTONES.length - 1 && styles.divider]}>
            <Icon name={earned.has(m.id) ? 'trophy' : 'trophy-outline'} size={20} color={earned.has(m.id) ? colors.black : colors.disabled} />
            <AppText variant="body" color={earned.has(m.id) ? undefined : 'secondary'}>
              {t(`journey.milestone.${m.id}`)}
            </AppText>
          </View>
        ))}
      </Card>

      <Card variant="outline" padded={false}>
        <ListRow icon="images-outline" label={t('journey.photos')} hint={t('journey.photosHint')} onPress={() => router.push('/photos')} divider={false} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', gap: spacing.sm },
  gap: { gap: spacing.sm },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  months: { flexDirection: 'row', gap: 6 },
  month: { flex: 1, height: 32, borderRadius: 8, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  monthDone: { backgroundColor: colors.black, borderColor: colors.black },
  monthNow: { borderColor: colors.black, borderWidth: 2 },
  milestone: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, minHeight: 52 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
});
