import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button, Screen, TextField } from '@/components/ui';
import { useAppState } from '@/state/AppStateProvider';

export default function EditNameScreen() {
  const { t } = useTranslation();
  const { data, dispatch } = useAppState();
  const [name, setName] = useState(data.profile?.name ?? '');
  return (
    <Screen
      back="close"
      title={t('profile.editName')}
      footer={
        <Button
          label={t('common.save')}
          onPress={async () => {
            await dispatch({ type: 'updateProfile', patch: { name: name.trim() } }).catch(() => undefined);
            router.back();
          }}
        />
      }>
      <TextField label={t('profile.name')} placeholder={t('onboarding.name.placeholder')} value={name} onChangeText={setName} autoCapitalize="words" maxLength={40} autoFocus />
    </Screen>
  );
}
