import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useOnboardingDraft } from '@/components/onboarding/OnboardingDraft';
import { OnboardingStep } from '@/components/onboarding/OnboardingStep';
import { pillarIcons, SelectCard } from '@/components/ui';
import { PILLARS } from '@/domain/types';
import { pillarColors } from '@/theme';

export default function FocusScreen() {
  const { t } = useTranslation();
  const { draft, update } = useOnboardingDraft();
  const none = draft.pillars.length === 0;

  return (
    <OnboardingStep
      step={3}
      title={t('onboarding.focus.title')}
      subtitle={t('onboarding.focus.subtitle')}
      nextDisabled={none}
      footerNote={none ? t('onboarding.focus.minOne') : undefined}
      onNext={() => router.push('/rhythm')}>
      {PILLARS.map((p) => {
        const selected = draft.pillars.includes(p);
        return (
          <SelectCard
            key={p}
            title={t(`pillars.${p}.name`)}
            description={t(`pillars.${p}.description`)}
            icon={pillarIcons[p]}
            tint={pillarColors[p].tint}
            accent={pillarColors[p].strong}
            selected={selected}
            onPress={() =>
              update({
                pillars: selected ? draft.pillars.filter((x) => x !== p) : PILLARS.filter((x) => x === p || draft.pillars.includes(x)),
                goalIds: [], // re-suggest goals for the new focus
              })
            }
          />
        );
      })}
    </OnboardingStep>
  );
}
