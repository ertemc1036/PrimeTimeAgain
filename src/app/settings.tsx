import { router } from 'expo-router';
import { StyleSheet, Switch, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Card, ListRow, Screen } from '@/components/ui';
import { APP_VERSION, DEMO_MODE } from '@/config/app';
import { buildDemoData } from '@/data/demoSeed';
import { getLanguage } from '@/i18n/languages';
import { useLanguage } from '@/i18n/useLanguage';
import { useAppState } from '@/state/AppStateProvider';
import { colors, spacing } from '@/theme';
import { confirm, notify } from '@/utils/confirm';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { code } = useLanguage();
  const { data, today, updatePreferences, resetAll, completeOnboarding } = useAppState();

  const reset = async () => {
    const ok = await confirm({
      title: t('settings.resetTitle'),
      message: t('settings.resetBody'),
      confirmLabel: t('settings.resetConfirm'),
      cancelLabel: t('common.cancel'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await resetAll();
      router.replace('/welcome');
    } catch {
      notify(t('states.errorTitle'), t('states.saveError'));
    }
  };

  const loadDemo = async () => {
    if (!data.profile) return;
    try {
      await completeOnboarding(
        buildDemoData({
          profile: data.profile,
          goalIds: data.goalIds,
          today,
          reflectionTexts: [t('demo.reflections.r1'), t('demo.reflections.r2'), t('demo.reflections.r3')],
        }),
      );
      router.back();
    } catch {
      notify(t('states.errorTitle'), t('states.saveError'));
    }
  };

  return (
    <Screen back="back" title={t('settings.title')}>
      <Section title={t('settings.preferences')}>
        <ListRow icon="globe" label={t('settings.language')} value={getLanguage(code).nativeName} onPress={() => router.push('/language')} />
        <ListRow
          icon="bell"
          label={t('settings.reminders')}
          hint={t('settings.remindersHint')}
          right={
            <Switch
              value={data.preferences.reminders}
              onValueChange={(reminders) => updatePreferences({ ...data.preferences, reminders })}
              trackColor={{ true: colors.primary, false: colors.border }}
              accessibilityLabel={t('settings.reminders')}
            />
          }
        />
      </Section>

      <Section title={t('settings.about')}>
        <ListRow icon="info" label={t('settings.primeScore')} onPress={() => router.push('/prime-score')} />
        <ListRow icon="lock" label={t('settings.privacy')} hint={t('settings.privacyBody')} />
        <ListRow icon="smartphone" label={t('app.name')} value={t('settings.version', { version: APP_VERSION })} />
      </Section>

      <Section title={t('settings.data')}>
        {DEMO_MODE ? <ListRow icon="layers" label={t('demo.load')} hint={t('settings.demoNote')} onPress={loadDemo} /> : null}
        <ListRow icon="refresh-ccw" label={t('settings.reset')} destructive onPress={reset} />
      </Section>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="overline" color={colors.textMuted} style={styles.sectionTitle}>
        {title}
      </AppText>
      <Card padded={false}>{children}</Card>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.xs },
  sectionTitle: { paddingHorizontal: spacing.xs },
});
