import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Card } from '@/components/ui';
import type { Reflection } from '@/domain/types';
import { formatDate } from '@/i18n/format';
import { useLanguage } from '@/i18n/useLanguage';
import { colors, palette, radii, spacing } from '@/theme';

export const moodColors: Record<Reflection['mood'], string> = {
  1: palette.lightBlue,
  2: palette.blueSoft,
  3: palette.sage,
  4: palette.peachSoft,
  5: palette.peach,
};

export function ReflectionCard({ reflection }: { reflection: Reflection }) {
  const { t } = useTranslation();
  const { code } = useLanguage();
  return (
    <Card style={styles.card} elevated={false}>
      <View style={styles.head}>
        <AppText variant="label" color={colors.textMuted}>
          {formatDate(reflection.date, code, { weekday: 'long', day: 'numeric', month: 'long' })}
        </AppText>
        <View style={[styles.mood, { backgroundColor: moodColors[reflection.mood] }]}>
          <AppText variant="label">{t(`reflection.moods.${reflection.mood}`)}</AppText>
        </View>
      </View>
      {reflection.promptKey ? (
        <AppText variant="caption" color={colors.textSecondary}>
          {t(reflection.promptKey as 'reflection.prompts.p1')}
        </AppText>
      ) : null}
      <AppText variant="body">{reflection.body}</AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.xs, borderWidth: 1, borderColor: colors.border },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  mood: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radii.pill },
});
