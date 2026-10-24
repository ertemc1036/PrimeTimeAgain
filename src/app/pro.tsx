import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Card, Icon, Screen } from '@/components/ui';
import { status, spacing, useColors } from '@/theme';

/** Prime Pro preview. No payments: RevenueCat integration needs approval and a development build. */
export default function ProScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const free = t('pro.freeItems', { returnObjects: true }) as unknown as string[];
  const pro = t('pro.proItems', { returnObjects: true }) as unknown as string[];
  return (
    <Screen back="back" title={t('pro.title')} subtitle={t('pro.subtitle')} footer={<Button label={t('pro.cta')} disabled />}>
      <Card style={styles.card}>
        <AppText variant="overline" color="secondary">
          {t('pro.free')}
        </AppText>
        {free.map((item) => (
          <View key={item} style={styles.row}>
            <Icon name="check" size={16} color={status.prime} />
            <AppText variant="body">{item}</AppText>
          </View>
        ))}
      </Card>
      <Card variant="inverse" style={styles.card}>
        <AppText variant="overline" color={colors.onAccent}>
          {t('pro.title')}
        </AppText>
        {pro.map((item) => (
          <View key={item} style={styles.row}>
            <Icon name="star" size={16} color={colors.onAccent} />
            <AppText variant="body" color={colors.onAccent}>
              {item}
            </AppText>
          </View>
        ))}
      </Card>
      <AppText variant="caption" color="secondary">
        {t('pro.note')}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm, padding: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
