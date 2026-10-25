import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, OptionCard, Segmented, TextField } from '@/components/ui';
import { BodyFields, type BodyInputs } from '@/features/BodyFields';
import { useOnboarding } from '@/features/onboarding/draft';
import { OnboardingStep } from '@/features/onboarding/OnboardingStep';
import { heightToInputs, parseHeight, parseWeight, weightToInput } from '@/features/units';
import type { Units } from '@/domain/types';
import { spacing } from '@/theme';

export default function ProfileStep() {
  const { t } = useTranslation();
  const { draft, update } = useOnboarding();
  const [name, setName] = useState(draft.name);
  const [adult, setAdult] = useState(draft.adultConfirmed);
  const [units, setUnits] = useState<Units>(draft.units);
  const [body, setBody] = useState<BodyInputs>({ ...heightToInputs(draft.heightCm), weight: weightToInput(draft.weightKg, draft.units) });
  const [submitted, setSubmitted] = useState(false);

  const height = parseHeight(body.cm, body.ft, body.inch, units);
  const weight = parseWeight(body.weight, units);
  const nameError = submitted && !name.trim() ? t('onboarding.profile.nameError') : undefined;
  const heightError = height === null ? t('onboarding.goals.invalid') : undefined;
  const weightError = weight === null ? t('onboarding.goals.invalid') : undefined;

  const onContinue = () => {
    setSubmitted(true);
    if (!name.trim() || height === null || weight === null) return;
    update({ name: name.trim().slice(0, 40), units, heightCm: height, weightKg: weight, adultConfirmed: adult });
    if (!adult) router.push('/adults-only');
    else router.push('/goals');
  };

  return (
    <OnboardingStep step={1} title={t('onboarding.profile.title')} onContinue={onContinue}>
      <TextField label={t('onboarding.profile.name')} placeholder={t('onboarding.profile.namePlaceholder')} value={name} onChangeText={setName} autoCapitalize="words" textContentType="givenName" error={nameError} maxLength={40} />
      <OptionCard title={t('onboarding.profile.adult')} subtitle={t('onboarding.profile.adultHint')} selected={adult} onPress={() => setAdult(!adult)} mode="checkbox" />
      <View style={styles.group}>
        <AppText variant="subheading">{t('onboarding.profile.units')}</AppText>
        <Segmented
          value={units}
          options={[
            { value: 'metric', label: t('onboarding.profile.metric') },
            { value: 'imperial', label: t('onboarding.profile.imperial') },
          ]}
          onChange={(u) => {
            // Keep the typed weight meaningful when switching units.
            if (weight) setBody({ ...body, ...heightToInputs(height ?? undefined), weight: weightToInput(weight, u) });
            setUnits(u);
          }}
        />
      </View>
      <BodyFields units={units} value={body} onChange={setBody} heightError={heightError} weightError={weightError} />
      <AppText variant="caption" color="secondary">
        {t('onboarding.profile.privacy')}
      </AppText>
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({ group: { gap: spacing.xs } });
