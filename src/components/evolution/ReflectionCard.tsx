import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Card } from '@/components/ui';
import type { Reflection } from '@/domain/types';
import { formatDate } from '@/i18n/format';
import { useLanguage } from '@/i18n/useLanguage';
import { radii, spacing, useColors } from '@/theme';

export function ReflectionCard({ reflection }: { reflection: Reflection }) {
  const { t } = useTranslation();
  const { code } = useLanguage();
  const colors = useColors();
  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <AppText variant="label" color="secondary" style={styles.flex}>
          {formatDate(reflection.date, code, { weekday: 'long', day: 'numeric', month: 'long' })}
        </AppText>
        <View style={[styles.mood, { backgroundColor: colors.background }]}>
          <AppText variant="label">{t(`reflection.moods.${reflection.mood}`)}</AppText>
        </View>
      </View>
      {reflection.promptKey ? (
        <AppText variant="caption" color="secondary">
          {t(reflection.promptKey as 'reflection.prompts.p1')}
        </AppText>
      ) : null}
      {reflection.body ? <AppText variant="body">{reflection.body}</AppText> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.xs },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  mood: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radii.pill },
});
