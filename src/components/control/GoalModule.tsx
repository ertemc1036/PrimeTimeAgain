import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { AppText, Glyph, PressableScale, ProgressRing } from '@/components/ui';
import { AREA_ICONS } from '@/domain/catalog';
import type { Tally } from '@/domain/progress';
import type { AreaId } from '@/domain/types';
import { palette, spacing } from '@/theme';

const SIZE = 68;

/** One life area around the avatar: ring = follow-through on that area's missions (last 14 days). */
export function GoalModule({ area, tally, onPress, delay = 0 }: { area: AreaId; tally: Tally; onPress: () => void; delay?: number }) {
  const { t } = useTranslation();
  const name = t(`areas.${area}`);
  const percent = tally.percent;
  return (
    <Animated.View entering={FadeIn.delay(delay).duration(600)}>
      <PressableScale
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={percent === null ? t('control.moduleEmpty', { area: name }) : t('control.moduleA11y', { area: name, percent: `${percent}%` })}
        style={styles.module}>
        <View style={styles.disc}>
          <ProgressRing progress={(percent ?? 0) / 100} size={SIZE} stroke={3} color={palette.white} track="rgba(255,255,255,0.18)">
            <Glyph name={AREA_ICONS[area]} size={18} color={palette.white} />
            <AppText variant="label" color={palette.white} style={styles.percent}>
              {percent === null ? '–' : t('common.percent', { value: percent })}
            </AppText>
          </ProgressRing>
        </View>
        <AppText variant="overline" color={palette.white} align="center" style={styles.label}>
          {name}
        </AppText>
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  module: { alignItems: 'center', gap: spacing.xxs, width: 92 },
  disc: { borderRadius: SIZE / 2, backgroundColor: 'rgba(8,9,11,0.55)' },
  percent: { marginTop: 1, fontSize: 12 },
  label: { letterSpacing: 1 },
});
