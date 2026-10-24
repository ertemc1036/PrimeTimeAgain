import { router, useIsFocused } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { DEFAULT_AVATAR } from '@/avatar/types';
import { AvatarCustomizer } from '@/components/avatar/AvatarCustomizer';
import { AppText, Button, Card, Screen } from '@/components/ui';
import { useAppState } from '@/state/AppStateProvider';
import { spacing } from '@/theme';

export default function AvatarStudioScreen() {
  const { t } = useTranslation();
  const focused = useIsFocused();
  const { data, dispatch } = useAppState();
  const [config, setConfig] = useState(data.avatar ?? DEFAULT_AVATAR);

  return (
    <Screen
      mode="dark"
      back="back"
      title={t('studio.title')}
      footer={
        <Button
          label={t('studio.save')}
          onPress={async () => {
            await dispatch({ type: 'setAvatar', avatar: config }).catch(() => undefined);
            router.back();
          }}
        />
      }>
      <AvatarCustomizer config={config} onChange={setConfig} active={focused} stageHeight={440} />
      <Card style={{ gap: spacing.xs }}>
        <AppText variant="subheading">{t('studio.more')}</AppText>
        <AppText variant="caption" color="secondary">
          {t('studio.moreBody')}
        </AppText>
      </Card>
      <AppText variant="caption" color="secondary">
        {t('studio.credit')}
      </AppText>
    </Screen>
  );
}
