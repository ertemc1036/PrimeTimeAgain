import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { MINUTE_OPTIONS } from '@/components/onboarding/minuteOptions';
import { AppText, Banner, Button, pillarIcons, Screen, SelectCard, TextField } from '@/components/ui';
import { PILLARS, type DailyMinutes, type Pillar } from '@/domain/types';
import { useAppState } from '@/state/AppStateProvider';
import { colors, pillarColors, spacing } from '@/theme';

export default function EditProfileScreen() {
  const { t } = useTranslation();
  const { data, updateProfile } = useAppState();
  const profile = data.profile;
  const [name, setName] = useState(profile?.name ?? '');
  const [pillars, setPillars] = useState<Pillar[]>(profile?.focusPillars ?? []);
  const [minutes, setMinutes] = useState<DailyMinutes>(profile?.dailyMinutes ?? 20);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!profile) return null;

  const save = async () => {
    setSaving(true);
    setFailed(false);
    try {
      await updateProfile({ ...profile, name: name.trim(), focusPillars: pillars, dailyMinutes: minutes });
      router.back();
    } catch {
      setFailed(true);
      setSaving(false);
    }
  };

  return (
    <Screen
      back="back"
      title={t('editProfile.title')}
      footer={<Button label={t('common.save')} onPress={save} loading={saving} disabled={pillars.length === 0} />}>
      {failed ? <Banner message={t('states.saveError')} onDismiss={() => setFailed(false)} /> : null}
      <TextField
        label={t('editProfile.name')}
        placeholder={t('onboarding.about.placeholder')}
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        maxLength={40}
      />
      <View style={styles.group}>
        <AppText variant="label" color={colors.textSecondary}>
          {t('editProfile.focus')}
        </AppText>
        {PILLARS.map((p) => {
          const selected = pillars.includes(p);
          return (
            <SelectCard
              key={p}
              title={t(`pillars.${p}.name`)}
              description={t(`pillars.${p}.description`)}
              icon={pillarIcons[p]}
              tint={pillarColors[p].tint}
              accent={pillarColors[p].strong}
              selected={selected}
              onPress={() => setPillars(selected ? pillars.filter((x) => x !== p) : PILLARS.filter((x) => x === p || pillars.includes(x)))}
            />
          );
        })}
      </View>
      <View style={styles.group}>
        <AppText variant="label" color={colors.textSecondary}>
          {t('editProfile.time')}
        </AppText>
        {MINUTE_OPTIONS.map((o) => (
          <SelectCard
            key={o.value}
            mode="radio"
            icon={o.icon}
            title={t(`onboarding.rhythm.${o.key}.title`)}
            description={t(`onboarding.rhythm.${o.key}.description`)}
            selected={minutes === o.value}
            onPress={() => setMinutes(o.value)}
          />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({ group: { gap: spacing.sm } });
