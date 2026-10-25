import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppText, Card, Icon } from '@/components/ui';
import { useOnboarding } from '@/features/onboarding/draft';
import { OnboardingStep } from '@/features/onboarding/OnboardingStep';
import { requestPermission } from '@/services/notifications';

export default function NotificationsStep() {
  const { t } = useTranslation();
  const { update } = useOnboarding();
  const [message, setMessage] = useState<string | null>(null);

  const enable = async () => {
    const result = await requestPermission();
    if (result === 'granted') {
      update({ notificationsEnabled: true });
      router.push('/finish');
    } else {
      update({ notificationsEnabled: false });
      setMessage(result === 'unsupported' ? t('onboarding.notifications.web') : t('onboarding.notifications.denied'));
    }
  };

  return (
    <OnboardingStep
      step={6}
      title={t('onboarding.notifications.title')}
      subtitle={t('onboarding.notifications.subtitle')}
      continueLabel={message ? t('common.continue') : t('onboarding.notifications.enable')}
      onContinue={() => (message ? router.push('/finish') : void enable())}
      secondary={
        message
          ? undefined
          : {
              label: t('onboarding.notifications.notNow'),
              onPress: () => {
                update({ notificationsEnabled: false });
                router.push('/finish');
              },
            }
      }>
      <Card>
        <Icon name="notifications-outline" size={28} />
        <AppText variant="body" style={{ marginTop: 8 }}>
          {t('notifications.content.planning.title')}
        </AppText>
      </Card>
      {message ? (
        <AppText variant="body" color="secondary" accessibilityLiveRegion="polite">
          {message}
        </AppText>
      ) : null}
    </OnboardingStep>
  );
}
