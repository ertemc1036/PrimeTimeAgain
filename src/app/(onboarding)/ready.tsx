import { router } from 'expo-router';
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { getPreset } from '@/avatar/presets';
import { DEFAULT_AVATAR } from '@/avatar/types';
import { useOnboardingDraft } from '@/components/onboarding/OnboardingDraft';
import { AppText, Banner, Button, Card, Glyph, Screen, TextField } from '@/components/ui';
import { DEMO_MODE } from '@/config/app';
import { DEMO_DAY, withDemoHistory } from '@/data/demoSeed';
import { today as getToday } from '@/domain/dates';
import { generateMissions } from '@/domain/missions';
import { buildPlan } from '@/domain/plan';
import { formatDate } from '@/i18n/format';
import { goalTitle, missionTitle } from '@/i18n/content';
import { useLanguage } from '@/i18n/useLanguage';
import { goalGlyph } from '@/state/selectors';
import { useAppState } from '@/state/AppStateProvider';
import { radii, spacing, useColors } from '@/theme';

/** Screen 9: the personalised plan summary. Nothing is saved until the user enters Prime Control. */
export default function ReadyScreen() {
  const { t } = useTranslation();
  const { code } = useLanguage();
  const colors = useColors();
  const { draft, update } = useOnboardingDraft();
  const { dispatch } = useAppState();
  const [busy, setBusy] = useState<'real' | 'demo' | null>(null);
  const [failed, setFailed] = useState(false);
  const today = getToday();
  const plan = useMemo(() => buildPlan(draft, today), [draft, today]);
  const firstMissions = useMemo(
    () => generateMissions(plan.goals, plan.program!, today, plan.profile!.startingPoint),
    [plan, today],
  );
  const name = draft.profile.name.trim();

  const finish = async (demo: boolean) => {
    setBusy(demo ? 'demo' : 'real');
    setFailed(false);
    const data = demo
      ? withDemoHistory(plan, today, [t('demo.reflections.r1'), t('demo.reflections.r2'), t('demo.reflections.r3'), t('demo.reflections.r4')])
      : plan;
    try {
      await dispatch({ type: 'replaceAll', data });
      router.replace('/control');
    } catch {
      setFailed(true);
      setBusy(null);
    }
  };

  return (
    <Screen
      back="back"
      title={t('onboarding.ready.title')}
      subtitle={name ? t('onboarding.ready.subtitle', { name }) : t('onboarding.ready.subtitleNoName')}
      footer={
        <>
          <Button label={t('onboarding.ready.cta')} icon="arrow-right" onPress={() => finish(false)} loading={busy === 'real'} disabled={!!busy} />
          {DEMO_MODE ? (
            <Button
              variant="ghost"
              size="md"
              label={t('onboarding.ready.demo')}
              accessibilityHint={t('onboarding.ready.demoHint', { day: DEMO_DAY })}
              onPress={() => finish(true)}
              loading={busy === 'demo'}
              disabled={!!busy}
            />
          ) : null}
        </>
      }>
      {failed ? <Banner message={t('states.saveError')} onDismiss={() => setFailed(false)} /> : null}

      <TextField
        label={t('onboarding.name.label')}
        placeholder={t('onboarding.name.placeholder')}
        optional={t('common.optional')}
        value={draft.profile.name}
        onChangeText={(n) => update({ profile: { ...draft.profile, name: n } })}
        autoCapitalize="words"
        autoComplete="given-name"
        textContentType="givenName"
        maxLength={40}
      />

      <Animated.View entering={FadeInDown.duration(450)}>
        <Card variant="inverse" style={styles.hero}>
          <View style={styles.heroStats}>
            <Stat label={t('onboarding.ready.duration')} value={t('common.days', { count: plan.program!.durationDays })} />
            <Stat label={t('onboarding.ready.time')} value={t('common.minutes', { count: plan.program!.dailyMinutes })} />
            <Stat label={t('onboarding.ready.start')} value={formatDate(today, code, { day: 'numeric', month: 'short' })} />
          </View>
          <View style={styles.avatarRow}>
            <Image source={getPreset((draft.avatar ?? DEFAULT_AVATAR).presetId).preview} style={styles.thumb} contentFit="cover" accessible={false} />
            <View style={styles.flex}>
              <AppText variant="overline" color={colors.onAccent} style={styles.dim}>
                {t('onboarding.ready.avatar')}
              </AppText>
              {!draft.avatar ? (
                <AppText variant="caption" color={colors.onAccent}>
                  {t('onboarding.ready.avatarSkipped')}
                </AppText>
              ) : null}
            </View>
          </View>
        </Card>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(120).duration(450)} style={styles.section}>
        <AppText variant="overline" color="secondary">
          {t('onboarding.ready.goals')}
        </AppText>
        <View style={styles.goals}>
          {plan.goals.map((g) => (
            <View key={g.id} style={[styles.goalPill, { backgroundColor: colors.surface }]}>
              <Glyph name={goalGlyph(g)} size={15} />
              <AppText variant="label">{goalTitle(t, g)}</AppText>
            </View>
          ))}
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(220).duration(450)} style={styles.section}>
        <AppText variant="overline" color="secondary">
          {t('onboarding.ready.firstMissions')}
        </AppText>
        <Card padded={false}>
          {firstMissions.map((m, i) => (
            <View key={m.id} style={[styles.mission, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
              <AppText variant="bodyStrong" style={styles.flex}>
                {missionTitle(t, m, plan.goals.find((g) => g.id === m.goalId))}
              </AppText>
              <AppText variant="label" color="secondary">
                {t('common.minutes', { count: m.minutes })}
              </AppText>
            </View>
          ))}
        </Card>
      </Animated.View>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={styles.stat}>
      <AppText variant="overline" color={colors.onAccent} style={styles.dim}>
        {label}
      </AppText>
      <AppText variant="heading" color={colors.onAccent}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { gap: spacing.lg, padding: spacing.lg },
  heroStats: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
  stat: { flex: 1, minWidth: 80, gap: 4 },
  dim: { opacity: 0.7 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  thumb: { width: 48, height: 64, borderRadius: radii.xs, backgroundColor: '#202126' },
  section: { gap: spacing.sm },
  goals: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  goalPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radii.pill },
  mission: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md },
});
