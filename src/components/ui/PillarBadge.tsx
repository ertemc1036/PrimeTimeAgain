import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { Pillar } from '@/domain/types';
import { pillarColors, radii, spacing } from '@/theme';

import { AppText } from './AppText';
import { Icon } from './Icon';

export const pillarIcons: Record<Pillar, 'activity' | 'feather' | 'compass'> = {
  body: 'activity',
  mind: 'feather',
  life: 'compass',
};

export function PillarBadge({ pillar }: { pillar: Pillar }) {
  const { t } = useTranslation();
  const c = pillarColors[pillar];
  return (
    <View style={[styles.badge, { backgroundColor: c.tint }]}>
      <Icon name={pillarIcons[pillar]} size={14} color={c.strong} />
      <AppText variant="label" color={c.strong}>
        {t(`pillars.${pillar}.name`)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radii.pill,
  },
});
