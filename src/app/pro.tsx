import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { Icon, useToast, type IconName } from '@/components/ui';
import { OnboardingScreen, OText, PrimaryButton, Radio, SoftCard, TextButton, haptic } from '@/features/onboarding/flow/ui';
import { openLegal } from '@/features/legal';
import { membershipKey, membershipOf } from '@/features/pro/membership';
import { ProTestModeCard } from '@/features/profile/ProTestModeCard';
import { PrimeCharacter } from '@/features/prime/character/PrimeCharacter';
import { formatDate } from '@/i18n/format';
import { useLocale } from '@/i18n/useLanguage';
import { loadPlans, manageSubscriptions, purchase, purchasesUnavailableReason, restore, yearlySaving, type PlanId, type StorePlan } from '@/services/subscriptions/revenuecat';
import { useAuth } from '@/state/AuthProvider';
import { usePro } from '@/state/ProProvider';
import { onboarding as o } from '@/theme';
import { notify } from '@/utils/confirm';

/**
 * PrimeMe+ – paywall and membership screen.
 *
 * Prices: only what the store (RevenueCat → App Store / Google Play) returns, localised for the
 * account's storefront. The per-month value and the saving of the yearly plan are computed from those
 * prices; nothing is hard-coded (reference prices for Germany live in App Store Connect only).
 * A free trial is mentioned only when the store offers one AND Apple says this account is eligible.
 * Pro itself is decided by the server (RevenueCat-verified); a purchase here only speeds up the display.
 *
 * Params: ?from=onboarding (after sign-up in the commercial mode: "continue with Free" goes to Today),
 * ?restore=1 (Profile → Restore purchases).
 */
const BENEFITS: { key: 'coach' | 'scan' | 'photo' | 'memory' | 'plans'; icon: IconName }[] = [
  { key: 'coach', icon: 'sparkles-outline' },
  { key: 'scan', icon: 'scan-outline' },
  { key: 'photo', icon: 'camera-outline' },
  { key: 'plans', icon: 'calendar-outline' },
  { key: 'memory', icon: 'bookmark-outline' },
];

export default function Paywall() {
  const { t } = useTranslation();
  const locale = useLocale();
  const toast = useToast();
  const auth = useAuth();
  const pro = usePro();
  const { from, restore: restoreParam } = useLocalSearchParams<{ from?: string; restore?: string }>();
  const fromOnboarding = from === 'onboarding';
  const userId = auth.status === 'signedIn' ? (auth.user?.id ?? null) : null;
  const [plan, setPlan] = useState<PlanId>('yearly');
  const [plans, setPlans] = useState<StorePlan[] | null>(null);
  const unavailable = purchasesUnavailableReason();
  const [loading, setLoading] = useState(!unavailable);
  const [busy, setBusy] = useState<null | 'buy' | 'restore'>(null);

  useEffect(() => {
    if (unavailable) return;
    void loadPlans(userId).then((p) => {
      setPlans(p);
      setLoading(false);
      if (p && !p.some((x) => x.id === 'yearly')) setPlan('monthly');
    });
  }, [unavailable, userId]);

  const leave = () => {
    if (fromOnboarding) router.replace('/today');
    else if (router.canGoBack()) router.back();
    else router.replace('/today');
  };

  const monthly = plans?.find((p) => p.id === 'monthly');
  const yearly = plans?.find((p) => p.id === 'yearly');
  const selected = plans?.find((p) => p.id === plan);
  const saving = yearlySaving(monthly, yearly);
  const money = (amount: number, currency: string) => {
    try {
      return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(Math.floor(amount * 100) / 100);
    } catch {
      return null;
    }
  };
  const trialText = (p: StorePlan) => (p.freeTrial ? t(`paywall.trial.${p.freeTrial.unit}`, { count: p.freeTrial.count }) : null);

  const buy = async () => {
    if (unavailable) return notify(t('paywall.title'), unavailable === 'not_supported' ? t('pro.storeUnavailable') : t('pro.notConfigured'));
    if (!userId) return router.push('/auth/sign-up');
    if (!selected) return notify(t('paywall.title'), t('pro.notConfigured'));
    setBusy('buy');
    const r = await purchase(userId, selected);
    setBusy(null);
    if (r.ok) {
      pro.setStoreEntitlement(r.entitlement);
      await pro.refresh();
      toast(t('pro.welcome'), 'sparkles-outline');
      leave();
    } else if (r.reason === 'pending') notify(t('paywall.title'), t('pro.pending'));
    else if (r.reason !== 'cancelled') notify(t('paywall.title'), t('pro.failed'));
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

  // "Restore purchases" in Profile opens this screen with ?restore=1 and starts the restore once.
  const restoreStarted = useRef(false);
  useEffect(() => {
    if (restoreParam !== '1' || restoreStarted.current || pro.isPro) return;
    restoreStarted.current = true;
    void doRestore();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once for this visit
  }, [restoreParam, pro.isPro]);

  if (pro.isPro) return <MembershipView onDone={leave} onRestore={() => void doRestore()} restoring={busy === 'restore'} />;

  const ctaLabel = !userId ? t('auth.create') : selected?.freeTrial ? t('paywall.startTrial') : t('paywall.continue');
  const legalLine = selected
    ? selected.freeTrial
      ? t(`paywall.termsTrial.${selected.id}`, { trial: trialText(selected), price: selected.price })
      : t(`paywall.terms.${selected.id}`, { price: selected.price })
    : null;

  return (
    <OnboardingScreen
      onBack={leave}
      scroll
      footer={
        <>
          <PrimaryButton label={busy === 'buy' ? t('paywall.processing') : ctaLabel} onPress={() => void buy()} disabled={busy !== null || (!!userId && !selected)} testID="paywall-cta" />
          <TextButton label={fromOnboarding ? t('paywall.continueFree') : t('paywall.notNow')} onPress={leave} />
        </>
      }>
      <Animated.View entering={FadeInDown.duration(320)} style={styles.hero}>
        <PrimeCharacter variant="motivation" size={120} radius={24} motion="enter" />
        <OText variant="title" style={styles.center} accessibilityRole="header">
          {t('paywall.title')}
        </OText>
        <OText variant="subtitle" style={styles.center}>
          {t('paywall.subtitle')}
        </OText>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(80).duration(320)} style={styles.benefits}>
        {BENEFITS.map((b) => (
          <View key={b.key} style={styles.benefit}>
            <View style={styles.benefitIcon}>
              <Icon name={b.icon} size={18} color={o.text} />
            </View>
            <View style={styles.flex}>
              <OText variant="option">{t(`paywall.benefits.${b.key}.title`)}</OText>
              <OText variant="caption">{t(`paywall.benefits.${b.key}.body`)}</OText>
            </View>
          </View>
        ))}
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(160).duration(320)} style={styles.plans} accessibilityRole="radiogroup">
        {plans ? (
          <>
            {yearly ? (
              <PlanCard
                selected={plan === 'yearly'}
                onPress={() => setPlan('yearly')}
                title={t('paywall.yearly')}
                price={t('paywall.perYear', { price: yearly.price })}
                detail={saving ? t('paywall.perMonthEq', { price: money(saving.perMonth, yearly.currency) }) : null}
                badge={saving && saving.percent > 0 ? t('paywall.save', { percent: saving.percent }) : null}
                trial={trialText(yearly)}
              />
            ) : null}
            {monthly ? (
              <PlanCard selected={plan === 'monthly'} onPress={() => setPlan('monthly')} title={t('paywall.monthly')} price={t('paywall.perMonth', { price: monthly.price })} trial={trialText(monthly)} />
            ) : null}
            {saving && yearly ? <OText variant="caption">{t('paywall.saveDetail', { amount: money(saving.saved, yearly.currency) })}</OText> : null}
          </>
        ) : (
          <SoftCard>
            <OText variant="body">{loading ? t('paywall.loading') : unavailable === 'not_supported' ? t('pro.storeUnavailable') : t('pro.notConfigured')}</OText>
          </SoftCard>
        )}
        {pro.status === 'expired' || pro.status === 'billing_issue' ? (
          <SoftCard>
            <OText variant="body">{t('pro.expired')}</OText>
          </SoftCard>
        ) : null}
        {!userId && auth.configured ? <OText variant="caption">{t('pro.signInFirst')}</OText> : null}
      </Animated.View>

      {legalLine ? <OText variant="caption">{legalLine}</OText> : null}
      <OText variant="caption">{t('paywall.cancel')}</OText>
      <OText variant="caption">{t('paywall.fair')}</OText>
      <OText variant="caption">{t('pro.free')}</OText>
      <LegalLinks onRestore={() => void doRestore()} restoring={busy === 'restore'} />
      {pro.testModeAllowed ? <ProTestModeCard /> : null}
    </OnboardingScreen>
  );
}

function PlanCard({ selected, onPress, title, price, detail, badge, trial }: { selected: boolean; onPress: () => void; title: string; price: string; detail?: string | null; badge?: string | null; trial?: string | null }) {
  return (
    <Pressable
      onPress={() => {
        haptic();
        onPress();
      }}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={[title, price, detail, badge, trial].filter(Boolean).join(', ')}
      style={({ pressed }) => [styles.plan, selected && styles.planOn, pressed && styles.pressed]}>
      <View style={styles.flex}>
        <View style={styles.planTitleRow}>
          <OText variant="option">{title}</OText>
          {badge ? (
            <View style={styles.badge}>
              <OText variant="caption" style={styles.badgeText}>
                {badge}
              </OText>
            </View>
          ) : null}
        </View>
        <OText variant="body" style={styles.planPrice}>
          {price}
        </OText>
        {detail ? <OText variant="caption">{detail}</OText> : null}
        {trial ? <OText variant="caption" style={styles.trial}>{trial}</OText> : null}
      </View>
      <Radio on={selected} />
    </Pressable>
  );
}

function LegalLinks({ onRestore, restoring }: { onRestore: () => void; restoring: boolean }) {
  const { t } = useTranslation();
  return (
    <View style={styles.links}>
      <OText variant="caption" style={styles.link} onPress={onRestore} accessibilityRole="button">
        {restoring ? t('paywall.restoring') : t('pro.restore')}
      </OText>
      <OText variant="caption" style={styles.link} onPress={() => openLegal('terms')} accessibilityRole="link">
        {t('profile.terms')}
      </OText>
      <OText variant="caption" style={styles.link} onPress={() => openLegal('privacy')} accessibilityRole="link">
        {t('profile.privacyPolicy')}
      </OText>
    </View>
  );
}

/** Active PrimeMe+: what the account has, until when, and how to manage it. */
function MembershipView({ onDone, onRestore, restoring }: { onDone: () => void; onRestore: () => void; restoring: boolean }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const pro = usePro();
  const m = membershipOf(pro);
  const date = pro.expiresAt ? formatDate(pro.expiresAt.slice(0, 10), locale, { day: 'numeric', month: 'long', year: 'numeric' }) : null;
  const store = pro.access === 'store';
  const rows: [string, string][] = [[t('membership.status'), t(membershipKey(m))]];
  if (store && date) {
    const key = pro.subscription?.trial ? 'membership.trialEnds' : pro.subscription?.willRenew === false ? 'membership.ends' : pro.subscription?.willRenew ? 'membership.renews' : 'membership.validUntil';
    rows.push([t(key), date]);
  }
  if (pro.access === 'founder' && pro.founderSeat) rows.push([t('membership.seat'), `#${pro.founderSeat}`]);
  const body = pro.access === 'beta' ? t('pro.sourceBetaBody') : pro.access === 'founder' ? t('pro.sourceFounderBody') : pro.access === 'test' ? t('pro.sourceTestBody') : t('membership.storeBody');

  return (
    <OnboardingScreen onBack={onDone} title={t(membershipKey(m))} subtitle={body} scroll footer={<PrimaryButton label={t('common.done')} onPress={onDone} />}>
      <SoftCard>
        {rows.map(([k, v]) => (
          <View key={k} style={styles.row}>
            <OText variant="caption" style={styles.flex}>
              {k}
            </OText>
            <OText variant="option">{v}</OText>
          </View>
        ))}
      </SoftCard>
      {pro.status === 'grace_period' ? (
        <SoftCard>
          <OText variant="body">{t('pro.grace')}</OText>
        </SoftCard>
      ) : null}
      <TextButton label={t('pro.manage')} onPress={() => void manageSubscriptions().then((ok) => !ok && notify(t('pro.manage'), t('paywall.cancel')))} />
      <OText variant="caption">{store ? t('paywall.cancel') : t('membership.noSubscription')}</OText>
      <OText variant="caption">{t('membership.deleteNote')}</OText>
      <LegalLinks onRestore={onRestore} restoring={restoring} />
      {pro.testModeAllowed ? <ProTestModeCard /> : null}
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  hero: { alignItems: 'center', gap: 10 },
  benefits: { gap: 12 },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  benefitIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: o.soft, alignItems: 'center', justifyContent: 'center' },
  plans: { gap: 10 },
  plan: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderColor: o.border, borderRadius: 18, padding: 18, backgroundColor: o.card },
  planOn: { borderColor: o.selected, borderWidth: 2 },
  pressed: { opacity: 0.85 },
  planTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  planPrice: { color: o.text, fontWeight: '600' },
  trial: { color: o.text },
  badge: { backgroundColor: o.text, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { color: '#FFFFFF', fontWeight: '600' },
  links: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: 18, rowGap: 6 },
  link: { textDecorationLine: 'underline', color: o.text, paddingVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 36 },
});
