import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useOnboardingDraft } from '@/components/onboarding/OnboardingDraft';
import { OnboardingStep } from '@/components/onboarding/OnboardingStep';
import { AppText, SelectCard, TextField } from '@/components/ui';
import type { PrimeMemory } from '@/domain/types';
import { spacing } from '@/theme';

const OPTIONS: PrimeMemory[] = ['last_year', 'one_two', 'three_five', 'five_plus', 'first'];

/** Screen 4: "When did you feel like your best self?" Everything here is optional. */
export default function RememberScreen() {
  const { t } = useTranslation();
  const { draft, update } = useOnboardingDraft();
  const p = draft.profile;
  const setProfile = (patch: Partial<typeof p>) => update({ profile: { ...p, ...patch } });
  const first = p.memory === 'first';
  const next = () => router.push('/starting-point');

  return (
    <OnboardingStep step={3} title={t('onboarding.memory.title')} subtitle={t('onboarding.memory.subtitle')} onNext={next} onSkip={next}>
      <View style={styles.list} accessibilityRole="radiogroup">
        {OPTIONS.map((o) => (
          <SelectCard
            key={o}
            mode="radio"
            title={t(`onboarding.memory.options.${o}`)}
            selected={p.memory === o}
            onPress={() => setProfile({ memory: p.memory === o ? undefined : o })}
          />
        ))}
      </View>
      {p.memory ? (
        <View style={styles.questions}>
          {first ? (
            <TextField
              label={t('onboarding.memory.firstPrime')}
              optional={t('common.optional')}
              value={p.memoryRegain ?? ''}
              onChangeText={(memoryRegain) => setProfile({ memoryRegain })}
              multiline
              maxLength={400}
            />
          ) : (
            <>
              <TextField
                label={t('onboarding.memory.special')}
                optional={t('common.optional')}
                value={p.memorySpecial ?? ''}
                onChangeText={(memorySpecial) => setProfile({ memorySpecial })}
                multiline
                maxLength={400}
              />
              <TextField
                label={t('onboarding.memory.changed')}
                optional={t('common.optional')}
                value={p.memoryChanged ?? ''}
                onChangeText={(memoryChanged) => setProfile({ memoryChanged })}
                multiline
                maxLength={400}
              />
              <TextField
                label={t('onboarding.memory.regain')}
                optional={t('common.optional')}
                value={p.memoryRegain ?? ''}
                onChangeText={(memoryRegain) => setProfile({ memoryRegain })}
                multiline
                maxLength={400}
              />
            </>
          )}
          <AppText variant="caption" color="secondary">
            {t('onboarding.memory.private')}
          </AppText>
        </View>
      ) : null}
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.xs },
  questions: { gap: spacing.md, marginTop: spacing.sm },
});
