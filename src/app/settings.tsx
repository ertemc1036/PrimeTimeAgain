import { router } from 'expo-router';
import { useState } from 'react';
import { Share, StyleSheet, Switch, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Banner, Card, Chip, ListRow, Screen, SectionHeader } from '@/components/ui';
import { APP_VERSION, DEMO_MODE } from '@/config/app';
import { withDemoHistory } from '@/data/demoSeed';
import { getLanguage } from '@/i18n/languages';
import { useLanguage } from '@/i18n/useLanguage';
import { deleteAllProgressPhotos } from '@/services/photos';
import { REMINDER_TIMES, remindersSupported, scheduleDailyReminder } from '@/services/reminders';
import { useAppState } from '@/state/AppStateProvider';
import { spacing, useColors } from '@/theme';
import { confirm } from '@/utils/confirm';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const { code } = useLanguage();
  const colors = useColors();
  const { data, today, dispatch, resetAll } = useAppState();
  const [note, setNote] = useState<string | null>(null);
  const prefs = data.preferences;
  const setPref = (patch: Partial<typeof prefs>) => void dispatch({ type: 'updatePreferences', patch }).catch(() => setNote(t('states.saveError')));

  const setReminders = async (on: boolean) => {
    if (!on) return setPref({ reminders: false });
    const result = await scheduleDailyReminder(prefs.reminderTime, { title: t('reminder.title'), body: t('reminder.body') }).catch(() => 'denied' as const);
    if (result === 'denied') setNote(t('settings.remindersDenied'));
    else setPref({ reminders: true });
  };

  const exportData = async () => {
    try {
      await Share.share({ title: 'PrimeTimeAgain', message: JSON.stringify({ exportedAt: new Date().toISOString(), ...data }, null, 2) });
    } catch {
      setNote(t('states.errorBody'));
    }
  };

  const deleteAll = async () => {
    const ok = await confirm({ title: t('settings.deleteTitle'), message: t('settings.deleteBody'), confirmLabel: t('settings.deleteConfirm'), cancelLabel: t('common.cancel'), destructive: true });
    if (!ok) return;
    await deleteAllProgressPhotos();
    await resetAll();
    router.replace('/welcome');
  };

  const loadDemo = async () => {
    await dispatch({
      type: 'replaceAll',
      data: withDemoHistory({ ...data, days: {} }, today, [t('demo.reflections.r1'), t('demo.reflections.r2'), t('demo.reflections.r3'), t('demo.reflections.r4')]),
    }).catch(() => undefined);
    router.back();
  };

  const toggle = (value: boolean, onChange: (v: boolean) => void, label: string) => (
    <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.accent, false: colors.border }}
                thumbColor={colors.background}
                ios_backgroundColor={colors.border} accessibilityLabel={label} />
  );

  return (
    <Screen back="back" title={t('settings.title')}>
      {note ? <Banner message={note} onDismiss={() => setNote(null)} /> : null}

      <SectionHeader title={t('settings.general')} />
      <Card padded={false}>
        <ListRow icon="globe" label={t('settings.language')} value={getLanguage(code).nativeName} onPress={() => router.push('/language')} />
        <View style={styles.inline}>
          <AppText variant="bodyStrong">{t('settings.units')}</AppText>
          <View style={styles.chips} accessibilityRole="radiogroup">
            <Chip mode="radio" label={t('settings.unitsMetric')} selected={prefs.units === 'metric'} onPress={() => setPref({ units: 'metric' })} />
            <Chip mode="radio" label={t('settings.unitsImperial')} selected={prefs.units === 'imperial'} onPress={() => setPref({ units: 'imperial' })} />
          </View>
        </View>
      </Card>

      <SectionHeader title={t('settings.notifications')} />
      <Card padded={false}>
        <ListRow
          icon="bell"
          label={t('settings.reminders')}
          hint={t('settings.remindersHint')}
          right={toggle(prefs.reminders, (on) => void setReminders(on), t('settings.reminders'))}
          divider={!!prefs.reminders}
        />
        {prefs.reminders ? (
          <View style={styles.inline}>
            <AppText variant="bodyStrong">{t('settings.reminderTime')}</AppText>
            <View style={styles.chips} accessibilityRole="radiogroup">
              {REMINDER_TIMES.map((time) => (
                <Chip key={time} mode="radio" label={time} selected={prefs.reminderTime === time} onPress={() => setPref({ reminderTime: time })} />
              ))}
            </View>
          </View>
        ) : null}
      </Card>
      {!remindersSupported ? (
        <AppText variant="caption" color="secondary">
          {t('settings.remindersWeb')}
        </AppText>
      ) : null}

      <SectionHeader title={t('settings.privacy')} />
      <Card padded={false}>
        <ListRow icon="smartphone" label={t('settings.privacyLocal')} />
        <ListRow icon="lock" label={t('settings.photosPrivate')} />
        <ListRow
          icon="message-circle"
          label={t('settings.coachConsent')}
          hint={t('settings.coachConsentHint')}
          right={toggle(prefs.coachUsesReflections, (coachUsesReflections) => setPref({ coachUsesReflections }), t('settings.coachConsent'))}
          divider={false}
        />
      </Card>

      <SectionHeader title={t('settings.data')} />
      <Card padded={false}>
        <ListRow icon="share" label={t('settings.export')} hint={t('settings.exportHint')} onPress={() => void exportData()} />
        {DEMO_MODE ? <ListRow icon="layers" label={t('settings.demo')} hint={t('settings.demoHint')} onPress={() => void loadDemo()} /> : null}
        <ListRow icon="trash-2" label={t('settings.delete')} destructive onPress={() => void deleteAll()} divider={false} />
      </Card>

      <SectionHeader title={t('settings.account')} />
      <Card>
        <AppText variant="caption" color="secondary">
          {t('settings.accountBody')}
        </AppText>
      </Card>

      <SectionHeader title={t('settings.about')} />
      <Card padded={false}>
        <ListRow icon="info" label={t('settings.version', { version: APP_VERSION })} />
        <ListRow icon="file-text" label={t('settings.licenses')} hint={t('settings.licensesBody')} divider={false} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  inline: { padding: spacing.md, gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
