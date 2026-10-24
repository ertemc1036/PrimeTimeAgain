import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Card, Icon, Screen, SectionHeader } from '@/components/ui';
import { coachTips, coachToday, type CoachMessage, type CoachTip } from '@/domain/coach';
import { useAppState } from '@/state/AppStateProvider';
import { radii, spacing, useColors } from '@/theme';

/** Coach preview: rule-based guidance from local plan data. The AI coach will run server-side later. */
export default function CoachScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const { data, today } = useAppState();
  const message = coachToday(data, today);
  const tips = coachTips(data, today);

  const text = (m: CoachMessage) =>
    m.key === 'noneYet' ? t('coach.messages.noneYet', { minutes: m.minutes }) : m.key === 'streak' ? t('coach.messages.streak', { count: m.count }) : t(`coach.messages.${m.key}`);
  const tipText = (tip: CoachTip) => {
    switch (tip.key) {
      case 'lowArea':
        return t('coach.tips.lowArea', { area: t(`areas.${tip.area}`), percent: tip.percent });
      case 'phase':
        return t('coach.tips.phase', { phase: t(`journey.phase.${tip.phase}.name`), focus: t(`journey.phase.${tip.phase}.body`) });
      default:
        return t(`coach.tips.${tip.key}`);
    }
  };

  return (
    <Screen back="back" title={t('coach.title')} subtitle={t('coach.subtitle')}>
      <View style={[styles.badge, { borderColor: colors.text }]}>
        <AppText variant="overline">{t('coach.previewBadge')}</AppText>
      </View>
      <Card variant="inverse" style={styles.message}>
        <View style={styles.head}>
          <Icon name="message-circle" size={18} color={colors.onAccent} />
          <AppText variant="overline" color={colors.onAccent}>
            {t('coach.today')}
          </AppText>
        </View>
        <AppText variant="heading" color={colors.onAccent}>
          {text(message)}
        </AppText>
      </Card>

      <SectionHeader title={t('coach.suggestions')} />
      {tips.map((tip, i) => (
        <Card key={i} style={styles.tip}>
          <Icon name={tip.key === 'phase' ? 'map' : tip.key === 'strong' ? 'trending-up' : 'sliders'} size={18} />
          <AppText variant="body" style={styles.flex}>
            {tipText(tip)}
          </AppText>
        </Card>
      ))}
      <View style={styles.actions}>
        <Button label={t('coach.openMissions')} size="md" onPress={() => router.push('/missions')} />
        <Button label={t('coach.adjustTime')} size="md" variant="secondary" onPress={() => router.push('/plan')} />
        <Button label={t('coach.planRecovery')} size="md" variant="ghost" onPress={() => router.push('/calendar')} />
      </View>
      <AppText variant="caption" color="secondary">
        {t('coach.previewNote')}
      </AppText>
      <AppText variant="caption" color="secondary">
        {t('coach.limits')}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  badge: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  message: { gap: spacing.sm, padding: spacing.lg },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  tip: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  actions: { gap: spacing.xs },
});
