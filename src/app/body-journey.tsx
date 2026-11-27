import { Redirect, router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Card, ListRow, Screen, ToggleRow } from '@/components/ui';
import { FEATURES } from '@/config/features';
import { streakStats } from '@/domain/completion';
import { BodyHero } from '@/features/avatar/BodyHero';
import { useSave } from '@/hooks/useSave';
import { useAppState } from '@/state/AppStateProvider';
import { spacing } from '@/theme';

/**
 * Body Journey: the illustrative 3D body (start · now · goal) with weight data, plus links to the
 * weight log, private progress photos and the avatar body. Weight displays can be switched off here.
 */
export default function BodyJourneyScreen() {
  // The 3D body is switched off in this version: the progress overview takes its place.
  if (!FEATURES.bodyVisualizer3D) return <Redirect href="/journey" />;
  return <BodyJourney3D />;
}

function BodyJourney3D() {
  const { t } = useTranslation();
  const { data, today } = useAppState();
  const save = useSave();
  const showWeight = data.profile?.showWeight !== false;
  const streak = streakStats(data, today);

  return (
    <Screen back="back" title={t('bodyJourney.title')} subtitle={t('bodyJourney.subtitle')}>
      {showWeight ? (
        <BodyHero data={data} streak={streak.current} />
      ) : (
        <Card variant="accent" style={styles.gap}>
          <AppText variant="bodyStrong">{t('bodyJourney.hiddenTitle')}</AppText>
          <AppText variant="caption" color="secondary">
            {t('bodyJourney.hiddenBody')}
          </AppText>
        </Card>
      )}

      <Card variant="elevated" padded={false}>
        {showWeight ? <ListRow label={t('journey.addWeight')} icon="scale-outline" onPress={() => router.push('/weight')} /> : null}
        <ListRow label={t('bodyJourney.photos')} icon="images-outline" onPress={() => router.push('/photos')} />
        <ListRow label={t('avatar.bodyTitle')} icon="body-outline" onPress={() => router.push('/avatar-body')} />
        <ListRow label={t('profile.progress')} icon="trending-up-outline" onPress={() => router.push('/journey')} divider={false} />
      </Card>

      <Card variant="elevated" padded={false}>
        <View style={styles.toggle}>
          <ToggleRow
            label={t('bodyJourney.showWeight')}
            hint={t('bodyJourney.showWeightHint')}
            value={showWeight}
            onChange={(v) => void save({ type: 'updateProfile', patch: { showWeight: v } })}
            divider={false}
          />
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.xs },
  toggle: { paddingHorizontal: spacing.md },
});
