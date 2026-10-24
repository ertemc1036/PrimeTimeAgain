import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui';
import type { Status } from '@/domain/journey';
import { colors, palette, radii, spacing } from '@/theme';

const tones: Record<Status, { bg: string; fg: string }> = {
  done: { bg: palette.sage, fg: palette.greenDeep },
  current: { bg: palette.peach, fg: palette.ink },
  upcoming: { bg: colors.background, fg: colors.textMuted },
};

export function StatusPill({ status }: { status: Status }) {
  const { t } = useTranslation();
  const tone = tones[status];
  return (
    <View style={[styles.pill, { backgroundColor: tone.bg }]}>
      <AppText variant="label" color={tone.fg}>
        {t(`journey.status.${status}`)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radii.pill, alignSelf: 'flex-start' },
});
