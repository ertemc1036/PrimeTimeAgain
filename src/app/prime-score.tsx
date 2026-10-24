import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Card, Icon, Screen } from '@/components/ui';
import { colors, spacing } from '@/theme';

export default function PrimeScoreInfoScreen() {
  const { t } = useTranslation();
  return (
    <Screen back="close" title={t('primeScore.info.title')}>
      <Card tint={colors.surfaceAlt} elevated={false} style={styles.formula}>
        <Icon name="percent" size={18} color={colors.primaryText} />
        <AppText variant="bodyStrong" color={colors.primaryText} style={styles.flex}>
          {t('primeScore.info.formula')}
        </AppText>
      </Card>
      <View style={styles.body}>
        {(['p1', 'p2', 'p3', 'p4'] as const).map((p) => (
          <AppText key={p} variant="body" color={p === 'p3' ? colors.text : colors.textSecondary} style={p === 'p3' && styles.strong}>
            {t(`primeScore.info.${p}`)}
          </AppText>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  formula: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  body: { gap: spacing.md },
  strong: { fontWeight: '600' },
});
