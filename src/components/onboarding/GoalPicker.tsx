import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { PillarBadge, SelectCard } from '@/components/ui';
import { goalsForPillar, MAX_ACTIVE_GOALS } from '@/domain/catalog';
import { PILLARS, type GoalId, type Pillar } from '@/domain/types';
import { goalKey } from '@/i18n/keys';
import { pillarColors, spacing } from '@/theme';

/** Goal selection grouped by pillar. Shows the chosen pillars first, then the rest. */
export function GoalPicker({
  pillars,
  value,
  onChange,
}: {
  pillars: Pillar[];
  value: GoalId[];
  onChange: (ids: GoalId[]) => void;
}) {
  const { t } = useTranslation();
  const ordered = pillars.length ? pillars : [...PILLARS];
  const atMax = value.length >= MAX_ACTIVE_GOALS;

  return (
    <View style={{ gap: spacing.xl }}>
      {ordered.map((pillar) => (
        <View key={pillar} style={{ gap: spacing.sm }}>
          <PillarBadge pillar={pillar} />
          {goalsForPillar(pillar).map((goal) => {
            const selected = value.includes(goal.id);
            return (
              <SelectCard
                key={goal.id}
                icon={goal.icon}
                tint={pillarColors[pillar].soft}
                accent={pillarColors[pillar].strong}
                title={t(goalKey(goal.id, 'title'))}
                description={t(goalKey(goal.id, 'task'))}
                meta={t('common.minutes', { count: goal.minutes })}
                selected={selected}
                disabled={!selected && atMax}
                onPress={() => onChange(selected ? value.filter((id) => id !== goal.id) : [...value, goal.id])}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}
