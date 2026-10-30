import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Card, Icon, OptionCard, Screen, ToggleRow, useToast, type IconName } from '@/components/ui';
import { PLACEHOLDER_PRICES } from '@/config/app';
import { FounderCounter } from '@/features/founders/FounderCounter';
import { useFounderStatus } from '@/features/founders/useFounderStatus';
import { formatDate } from '@/i18n/format';
import { useLocale } from '@/i18n/useLanguage';
import { loadPlans, manageSubscriptions, purchase, purchasesUnavailableReason, restore, type PlanId, type StorePlan } from '@/services/subscriptions/revenuecat';
import { useAuth } from '@/state/AuthProvider';
import { usePro } from '@/state/ProProvider';
import { colors, radii, spacing } from '@/theme';
import { notify } from '@/utils/confirm';

const BENEFITS: { key: 'b1' | 'b2' | 'b3'; icon: IconName }[] = [
  { key: 'b1', icon: 'scan-outline' },
  { key: 'b2', icon: 'camera-outline' },
  { key: 'b3', icon: 'sparkles-outline' },
];

export default function Paywall() {
  const { t } = useTranslation();
  const locale = useLocale();
  const toast = useToast();
  const auth = useAuth();
  const pro = usePro();
  const userId = auth.status === 'signedIn' ? (auth.user?.id ?? null) : null;
  const [plan, setPlan] = useState<PlanId>('monthly');
  const [plans, setPlans] = useState<StorePlan[] | null>(null);
  const [busy, setBusy] = useState<null | 'buy' | 'restore'>(null);
  const unavailable = purchasesUnavailableReason();
  const founders = useFounderStatus();
  // While founder seats are left, new verified accounts get Pro free: no subscription is offered.
  const seatsOpen = !!founders.status && founders.status.remaining > 0;

  useEffect(() => {
    if (!unavailable) void loadPlans(userId).then(setPlans);
  }, [unavailable, userId]);

  const price = (id: PlanId) => plans?.find((p) => p.id === id)?.price ?? PLACEHOLDER_PRICES[id];
  const provisional = !plans;
  const hasYearly = !!plans?.some((p) => p.id === 'yearly');

  const buy = async () => {
    if (unavailable) return notify(t('pro.title'), unavailable === 'not_supported' ? t('pro.storeUnavailable') : t('pro.notConfigured'));
    if (!userId) return router.push('/auth/sign-up');
    const selected = plans?.find((p) => p.id === plan);
    if (!selected) return notify(t('pro.title'), t('pro.notConfigured'));
    setBusy('buy');
    const r = await purchase(userId, selected);
    setBusy(null);
    if (r.ok) {
      pro.setStoreEntitlement(r.entitlement);
      await pro.refresh();
      toast(t('pro.welcome'), 'sparkles-outline');
      if (router.canGoBack()) router.back();
    } else if (r.reason === 'pending') notify(t('pro.title'), t('pro.pending'));
    else if (r.reason !== 'cancelled') notify(t('pro.title'), t('pro.failed'));
  };

  const doRestore = async () => {
    if (unavailable) return notify(t('pro.restore'), unavailable === 'not_supported' ? t('pro.storeUnavailable') : t('pro.notConfigured'));
    setBusy('restore');
    const r = await restore(userId);
    setBusy(null);
    if (!r.ok) return notify(t('pro.restore'), t('pro.failed'));
    pro.setStoreEntitlement(r.entitlement);
    await pro.refresh();
    notify(t('pro.restore'), r.entitlement.tier === 'pro' ? t('pro.restored') : t('pro.nothingToRestore'));
  };

  const checkSeat = async () => {
    setBusy('buy');
    const e = await pro.refresh();
    await founders.reload();
    setBusy(null);
    if (!e) notify(t('pro.founders.title'), t('ai.offline'));
    else if (e.tier !== 'pro') notify(t('pro.founders.title'), t('pro.founders.notEligible'));
  };

  if (pro.isPro) {
    return (
      <Screen back="close" title={t('pro.isPro')} subtitle={t('pro.subtitle')}>
        {pro.access === 'founder' ? (
          <Card>
            <AppText variant="bodyStrong">{pro.founderSeat ? t('pro.sourceFounderSeat', { seat: pro.founderSeat }) : t('pro.sourceFounder')}</AppText>
            <AppText variant="caption">{t('pro.sourceFounderBody')}</AppText>
          </Card>
        ) : null}
        {pro.access === 'test' ? (
          <Card>
            <AppText variant="bodyStrong">{t('pro.sourceTest')}</AppText>
            <AppText variant="caption">{t('pro.sourceTestBody')}</AppText>
          </Card>
        ) : null}
        {pro.status === 'grace_period' ? (
          <Card>
            <AppText variant="body">{t('pro.grace')}</AppText>
          </Card>
        ) : null}
        {pro.expiresAt ? <AppText variant="body">{t('pro.renews', { date: formatDate(pro.expiresAt.slice(0, 10), locale, { day: 'numeric', month: 'long', year: 'numeric' }) })}</AppText> : null}
        {pro.access === 'store' ? (
          <>
            <Button label={t('pro.manage')} variant="secondary" onPress={() => void manageSubscriptions().then((ok) => !ok && notify(t('pro.manage'), t('pro.cancelInfo')))} />
            <AppText variant="caption" color="secondary">
              {t('pro.cancelInfo')}
            </AppText>
          </>
        ) : null}
      </Screen>
    );
  }

  return (
    <Screen
      back="close"
      title={t('pro.title')}
      subtitle={t('pro.subtitle')}
      footer={
        seatsOpen ? (
          userId ? (
            pro.identityVerified === false ? (
              <Button label={t('pro.founders.confirmCta')} onPress={() => router.push('/auth/confirm-email')} />
            ) : (
              <Button label={t('pro.founders.check')} onPress={() => void checkSeat()} loading={busy === 'buy'} />
            )
          ) : (
            <Button label={t('pro.founders.create')} onPress={() => router.push('/auth/sign-up')} />
          )
        ) : (
          <>
            <Button label={!userId && auth.configured && !unavailable ? t('auth.create') : t('pro.subscribe')} onPress={() => void buy()} loading={busy === 'buy'} />
            <Button label={t('pro.restore')} variant="ghost" size="sm" onPress={() => void doRestore()} loading={busy === 'restore'} />
          </>
        )
      }>
      {founders.status ? <FounderCounter status={founders.status} /> : null}
      {seatsOpen && userId ? (
        <AppText variant="caption" color="secondary">
          {t('pro.founders.signedInHint')}
        </AppText>
      ) : null}
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
      {seatsOpen ? null : (
        <>
          <OptionCard title={t('pro.monthly')} subtitle={t('pro.perMonth', { price: price('monthly') })} selected={plan === 'monthly'} onPress={() => setPlan('monthly')} />
          {/* A yearly plan is shown only once the store actually offers one. */}
          {hasYearly ? <OptionCard title={t('pro.yearly')} subtitle={t('pro.perYear', { price: price('yearly') })} selected={plan === 'yearly'} onPress={() => setPlan('yearly')} /> : null}
          {pro.status === 'expired' || pro.status === 'billing_issue' ? (
            <Card>
              <AppText variant="body">{t('pro.expired')}</AppText>
            </Card>
          ) : null}
          {unavailable || provisional || (!userId && auth.configured) ? (
            <Card>
              <AppText variant="caption">
                {unavailable === 'not_supported' ? t('pro.storeUnavailable') : unavailable === 'not_configured' || provisional ? t('pro.notConfigured') : t('pro.signInFirst')}
              </AppText>
            </Card>
          ) : null}
          <AppText variant="caption" color="secondary">
            {t('pro.cancelInfo')}
          </AppText>
        </>
      )}
      <AppText variant="caption" color="secondary">
        {t('pro.noGuarantee')}
      </AppText>
      <AppText variant="caption" color="secondary">
        {t('pro.free')}
      </AppText>
      {__DEV__ ? (
        <Card variant="outline" padded={false}>
          <ToggleRow label={t('pro.devPreview')} hint={t('pro.devPreviewHint')} value={pro.devPreview} onChange={pro.setDevPreview} divider={false} />
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  benefit: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: { width: 44, height: 44, borderRadius: radii.sm, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, gap: 2 },
});
