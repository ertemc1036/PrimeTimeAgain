import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { useOnboardingDraft } from '@/components/onboarding/OnboardingDraft';
import { AppText, Banner, Button, Card, Icon, PillarBadge, Screen } from '@/components/ui';
import { DEMO_MODE } from '@/config/app';
import { buildDemoData, DEMO_DAY } from '@/data/demoSeed';
import { today as getToday } from '@/domain/dates';
import type { AppData, Profile } from '@/domain/types';
import { goalKey } from '@/i18n/keys';
import { useAppState } from '@/state/AppStateProvider';
import { colors, radii, spacing } from '@/theme';

export default function ReadyScreen() {
  const { t } = useTranslation();
  const { draft } = useOnboardingDraft();
  const { completeOnboarding } = useAppState();
  const [busy, setBusy] = useState<'real' | 'demo' | null>(null);
  const [failed, setFailed] = useState(false);
  const name = draft.name.trim();

  const finish = async (withDemo: boolean) => {
    setBusy(withDemo ? 'demo' : 'real');
    setFailed(false);
    const today = getToday();
    const profile: Omit<Profile, 'startDate'> = {
      name,
      dailyMinutes: draft.dailyMinutes,
      focusPillars: draft.pillars,
      createdAt: new Date().toISOString(),
    };
    const data: AppData = withDemo
      ? buildDemoData({
          profile,
          goalIds: draft.goalIds,
          today,
          reflectionTexts: [t('demo.reflections.r1'), t('demo.reflections.r2'), t('demo.reflections.r3')],
        })
      : {
          version: 1,
          profile: { ...profile, startDate: today },
          goalIds: draft.goalIds,
          log: {},
          reflections: [],
          preferences: { reminders: false },
        };
    try {
      await completeOnboarding(data);
      router.replace('/');
    } catch {
      setFailed(true);
      setBusy(null);
    }
  };

  return (
    <Screen
      back="back"
      footer={
        <>
          <Button label={t('onboarding.ready.start')} onPress={() => finish(false)} loading={busy === 'real'} disabled={!!busy} />
          {DEMO_MODE ? (
            <Button
              variant="ghost"
              label={t('demo.preview')}
              accessibilityHint={t('demo.previewHint', { day: DEMO_DAY })}
              onPress={() => finish(true)}
              loading={busy === 'demo'}
              disabled={!!busy}
            />
          ) : null}
          {DEMO_MODE ? (
            <AppText variant="caption" color={colors.textMuted} align="center">
              {t('demo.previewHint', { day: DEMO_DAY })}
            </AppText>
          ) : null}
        </>
      }>
      <Animated.View entering={ZoomIn.duration(500)} style={styles.badge}>
        <Icon name="sunrise" size={34} color={colors.primaryText} />
      </Animated.View>
      <Animated.View entering={FadeInDown.delay(100).duration(450)} style={styles.head}>
        <AppText variant="display">{name ? t('onboarding.ready.title', { name }) : t('onboarding.ready.titleNoName')}</AppText>
        <AppText variant="body" color={colors.textSecondary}>
          {t('onboarding.ready.subtitle')}
        </AppText>
      </Animated.View>
      {failed ? <Banner message={t('states.saveError')} onDismiss={() => setFailed(false)} /> : null}
      <Animated.View entering={FadeInDown.delay(220).duration(450)}>
        <Card style={styles.summary}>
          <SummaryRow label={t('onboarding.ready.focus')}>
            <View style={styles.badges}>
              {draft.pillars.map((p) => (
                <PillarBadge key={p} pillar={p} />
              ))}
            </View>
          </SummaryRow>
          <SummaryRow label={t('onboarding.ready.goals')}>
            {draft.goalIds.map((id) => (
              <AppText key={id} variant="body">
                {t(goalKey(id, 'title'))}
              </AppText>
            ))}
          </SummaryRow>
          <SummaryRow label={t('onboarding.ready.time')}>
            <AppText variant="body">{t('common.minutes', { count: draft.dailyMinutes })}</AppText>
          </SummaryRow>
        </Card>
      </Animated.View>
    </Screen>
  );
}

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <AppText variant="overline" color={colors.textMuted}>
        {label}
      </AppText>
      <View style={styles.rowBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: 72,
    height: 72,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  head: { gap: spacing.sm },
  summary: { gap: spacing.lg },
  row: { gap: spacing.xs },
  rowBody: { gap: spacing.xxs },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
