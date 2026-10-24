import { router, useIsFocused } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { DEFAULT_AVATAR } from '@/avatar/types';
import { AvatarCustomizer } from '@/components/avatar/AvatarCustomizer';
import { useOnboardingDraft } from '@/components/onboarding/OnboardingDraft';
import { OnboardingStep } from '@/components/onboarding/OnboardingStep';
import { AppText } from '@/components/ui';
import { spacing } from '@/theme';

/** Screen 8: pick a starting avatar, or skip and keep the default. */
export default function CreateAvatarScreen() {
  const { t } = useTranslation();
  const focused = useIsFocused();
  const { draft, update } = useOnboardingDraft();
  const config = draft.avatar ?? DEFAULT_AVATAR;

  return (
    <OnboardingStep
      step={7}
      title={t('onboarding.avatar.title')}
      subtitle={t('onboarding.avatar.subtitle')}
      onNext={() => router.push('/ready')}
      onSkip={() => {
        update({ avatar: null });
        router.push('/ready');
      }}>
      <View style={styles.wrap}>
        <AvatarCustomizer config={config} onChange={(avatar) => update({ avatar })} active={focused} stageHeight={380} />
        <AppText variant="caption" color="secondary" align="center">
          {t('onboarding.avatar.hint')}
        </AppText>
      </View>
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({ wrap: { gap: spacing.sm } });
