import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { AppText, OptionCard, Screen } from '@/components/ui';
import type { AvatarBody } from '@/domain/types';
import { useAppState } from '@/state/AppStateProvider';

const OPTIONS: { body: AvatarBody; icon: 'man-outline' | 'woman-outline' | 'body-outline' }[] = [
  { body: 'male', icon: 'man-outline' },
  { body: 'female', icon: 'woman-outline' },
  { body: 'neutral', icon: 'body-outline' },
];

/** Optional choice of the body shown by the 3D avatar on Today. Saved in the profile (synced with the account). */
export default function AvatarBodyScreen() {
  const { t } = useTranslation();
  const { data, dispatch } = useAppState();
  const current = data.profile?.avatarBody ?? 'neutral';
  return (
    <Screen back="close" title={t('avatar.bodyTitle')} subtitle={t('avatar.bodySubtitle')}>
      {OPTIONS.map((o) => (
        <OptionCard
          key={o.body}
          icon={o.icon}
          title={t(`avatar.body.${o.body}`)}
          selected={current === o.body}
          onPress={() => {
            void dispatch({ type: 'updateProfile', patch: { avatarBody: o.body } }).then(() => (router.canGoBack() ? router.back() : router.replace('/')));
          }}
        />
      ))}
      <AppText variant="caption" color="secondary">
        {t('avatar.bodyNote')}
      </AppText>
    </Screen>
  );
}
