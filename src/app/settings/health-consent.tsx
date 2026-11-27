import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useToast } from '@/components/ui';
import { hasHealthConsent } from '@/domain/consent';
import { HealthConsentView } from '@/features/consent/HealthConsentView';
import { OnboardingScreen, PrimaryButton, TextButton } from '@/features/onboarding/flow/ui';
import { useAppState } from '@/state/AppStateProvider';
import { confirm } from '@/utils/confirm';
import { nowISO } from '@/utils/id';

/**
 * Give the health-data consent (Profile → Privacy, the weight screen) or answer the current version
 * again (?reason=update, asked once when the consent text version changed or was never answered).
 */
export default function HealthConsentScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const { data, dispatch } = useAppState();
  const { reason } = useLocalSearchParams<{ reason?: string }>();
  const update = reason === 'update';
  const [checked, setChecked] = useState(false);
  const leave = () => (router.canGoBack() ? router.back() : router.replace('/today'));

  const grant = async () => {
    const r = await dispatch({ type: 'setHealthConsent', granted: true, at: nowISO() });
    if (r.ok) toast(t('consent.granted'), 'shield-checkmark-outline');
    leave();
  };
  const refuse = async () => {
    // Refusing deletes health data, so ask first when there is any.
    const p = data.profile;
    const hasData = !!p && (p.heightCm || p.startWeightKg || p.goalWeightKg || p.bodySex || (p.healthFlags ?? []).length || p.food.allergies.length || data.weights.length);
    if (hasData && !(await confirm({ title: t('consent.withdrawTitle'), message: t('consent.withdrawBody'), confirmLabel: t('consent.withdrawConfirm'), cancelLabel: t('common.cancel'), destructive: true })))
      return;
    if (p && (update || hasHealthConsent(p) || hasData)) await dispatch({ type: 'setHealthConsent', granted: false, at: nowISO() });
    leave();
  };

  return (
    <OnboardingScreen
      onBack={update ? undefined : leave}
      title={update ? t('consent.updateTitle') : t('consent.title')}
      subtitle={update ? t('consent.updateSub') : t('consent.sub')}
      scroll
      footer={
        <>
          <PrimaryButton label={t('consent.agree')} onPress={() => void grant()} disabled={!checked} testID="consent-agree" />
          <TextButton label={update ? t('consent.decline') : t('consent.later')} onPress={() => void (update ? refuse() : leave())} />
        </>
      }>
      <HealthConsentView checked={checked} onToggle={() => setChecked((c) => !c)} />
    </OnboardingScreen>
  );
}
