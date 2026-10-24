import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, PhotoHero, PressableScale, ProgressBar } from '@/components/ui';
import { currentPhase, JOURNEY_LENGTH } from '@/domain/journey';
import { colors, imagery, palette, spacing } from '@/theme';

export function JourneySummaryCard({ day }: { day: number }) {
  const { t } = useTranslation();
  const phase = currentPhase(day);
  return (
    <PressableScale onPress={() => router.push('/journey')} accessibilityRole="button" scaleTo={0.98}>
      <PhotoHero uri={imagery.journey} height={190}>
        <View style={styles.content}>
          <AppText variant="overline" color={colors.textOnPrimary}>
            {t('home.journeyTitle')} · {t(`journey.phases.${phase.id}.name`)}
          </AppText>
          <AppText variant="title" color={colors.textOnPrimary}>
            {t('home.dayOfJourney', { day })}
          </AppText>
          <ProgressBar progress={day / JOURNEY_LENGTH} color={palette.white} track="rgba(255,255,255,0.35)" height={6} />
        </View>
      </PhotoHero>
    </PressableScale>
  );
}

const styles = StyleSheet.create({ content: { gap: spacing.xs } });
