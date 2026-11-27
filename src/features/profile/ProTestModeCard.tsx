import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Card, ToggleRow } from '@/components/ui';
import { usePro } from '@/state/ProProvider';
import { spacing } from '@/theme';

/**
 * Pro test mode switch (development / internal test builds only, see src/config/testMode.ts) with the
 * server's view: AI features only work when the server lists this account as a tester.
 */
export function ProTestModeCard() {
  const { t } = useTranslation();
  const pro = usePro();
  if (!pro.testModeAllowed) return null;
  const serverStatus = pro.access === 'test' ? t('pro.testServerOn') : pro.isPro ? t('pro.testServerPro') : t('pro.testServerOff');
  return (
    <Card padded={false} style={styles.card} testID="pro-test-mode">
      <ToggleRow label={t('pro.testMode')} hint={t('pro.testModeHint')} value={pro.testMode} onChange={pro.setTestMode} divider={false} />
      <AppText variant="caption" color="secondary" style={styles.status}>
        {serverStatus}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  status: { paddingBottom: spacing.xs },
});
