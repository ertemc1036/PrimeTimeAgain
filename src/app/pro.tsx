import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Card, Icon, OptionCard, Screen, ToggleRow, type IconName } from '@/components/ui';
import { PLACEHOLDER_PRICES } from '@/config/app';
import { usePro } from '@/state/ProProvider';
import { spacing } from '@/theme';
import { notify } from '@/utils/confirm';

const BENEFITS: { key: 'b1' | 'b2' | 'b3'; icon: IconName }[] = [
  { key: 'b1', icon: 'scan-outline' },
  { key: 'b2', icon: 'camera-outline' },
  { key: 'b3', icon: 'sparkles-outline' },
];

export default function Paywall() {
  const { t } = useTranslation();
  const { isPro, devPreview, setDevPreview } = usePro();
  const [plan, setPlan] = useState<'yearly' | 'monthly'>('yearly');

  // Store purchases need RevenueCat + App Store / Google Play products and a development build.
  // Until those are configured this screen never pretends a purchase succeeded.
  const subscribe = () => notify(t('pro.title'), t('pro.unavailable'));
  const restore = () => notify(t('pro.restore'), t('pro.unavailable'));

  return (
    <Screen
      back="close"
      title={t('pro.title')}
      subtitle={t('pro.subtitle')}
      footer={
        isPro ? (
          <AppText variant="bodyStrong" align="center">
            {t('pro.isPro')}
          </AppText>
        ) : (
          <>
            <Button label={t('pro.subscribe')} onPress={subscribe} />
            <Button label={t('pro.restore')} variant="ghost" size="sm" onPress={restore} />
          </>
        )
      }>
      {BENEFITS.map((b) => (
        <View key={b.key} style={styles.benefit}>
          <View style={styles.icon}>
            <Icon name={b.icon} size={22} />
          </View>
          <View style={styles.flex}>
            <AppText variant="bodyStrong">{t(`pro.${b.key}.title`)}</AppText>
            <AppText variant="caption" color="secondary">
              {t(`pro.${b.key}.body`)}
            </AppText>
          </View>
        </View>
      ))}
      <OptionCard title={t('pro.yearly')} subtitle={`${t('pro.perYear', { price: PLACEHOLDER_PRICES.yearly })} · ${t('pro.save')}`} selected={plan === 'yearly'} onPress={() => setPlan('yearly')} />
      <OptionCard title={t('pro.monthly')} subtitle={t('pro.perMonth', { price: PLACEHOLDER_PRICES.monthly })} selected={plan === 'monthly'} onPress={() => setPlan('monthly')} />
      <Card>
        <AppText variant="caption">{t('pro.unavailable')}</AppText>
      </Card>
      <AppText variant="caption" color="secondary">
        {t('pro.cancelInfo')}
      </AppText>
      <AppText variant="caption" color="secondary">
        {t('pro.noGuarantee')}
      </AppText>
      <AppText variant="caption" color="secondary">
        {t('pro.free')}
      </AppText>
      {__DEV__ ? (
        <Card variant="outline" padded={false}>
          <ToggleRow label={t('pro.devPreview')} hint={t('pro.devPreviewHint')} value={devPreview} onChange={setDevPreview} divider={false} />
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  benefit: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, gap: 2 },
});
