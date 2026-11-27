import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';
import Animated, { FadeIn, SlideInLeft, SlideInRight, SlideOutLeft, SlideOutRight, useReducedMotion } from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { useTranslation } from 'react-i18next';

import { Icon, type IconName } from '@/components/ui';
import { checkGoalWeight, cmToFtIn, ftInToCm, kgToLb, lbToKg } from '@/domain/goals';
import { ageOn, computePlan, type Plan } from '@/domain/plan';
import { defaultNotifications, type Profile } from '@/domain/types';
import { AppleSignIn } from '@/features/auth/AppleSignIn';
import { AuthError } from '@/features/auth/AuthError';
import { PrimeCharacter } from '@/features/prime/character/PrimeCharacter';
import { useLocale } from '@/i18n/useLanguage';
import { authAvailable, PASSWORD_MIN, signUp, validEmail, type AuthErrorCode } from '@/services/auth';
import { useAppState } from '@/state/AppStateProvider';
import { useAuth } from '@/state/AuthProvider';
import { useSync } from '@/state/SyncProvider';
import { onboarding as o } from '@/theme';
import { nowISO } from '@/utils/id';

import { PhonePreview } from './PhonePreview';
import { PaceSlider, WeightRuler, WheelPicker } from './pickers';
import { healthRisk, NO_HEADER, useOnboardingFlow, type OnboardingDraft, type StepId } from './state';
import { clearDraft } from './storage';
import { OnboardingScreen, OptionCard, OText, PrimaryButton, SoftCard, TextButton, UnitSwitch } from './ui';

const YEAR = new Date().getFullYear();
const num = (v: number, locale: string, digits = 1) => v.toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** Plan from the answers (same function the loading screen "runs"). */
export const planFor = (d: OnboardingDraft): Plan =>
  computePlan({
    sex: d.bodySex === 'skip' ? undefined : d.bodySex,
    birthYear: d.birth?.year,
    heightCm: d.heightCm,
    weightKg: d.weightKg,
    goalWeightKg: d.goal === 'lose' && !healthRisk(d) ? d.goalWeightKg : undefined,
    workouts: d.workouts,
    goal: d.goal,
    pace: d.pace,
    healthRisk: healthRisk(d),
    year: YEAR,
  });

/** The whole onboarding: one full-screen step at a time, sliding left/right. */
export function OnboardingFlow() {
  const flow = useOnboardingFlow();
  const reduced = useReducedMotion();
  if (!flow.ready) return <View style={styles.blank} />;
  const step = flow.draft.step;
  const enter = reduced ? FadeIn.duration(120) : (flow.direction > 0 ? SlideInRight : SlideInLeft).duration(280);
  const exit = reduced ? undefined : (flow.direction > 0 ? SlideOutLeft : SlideOutRight).duration(280);
  return (
    <View style={styles.blank}>
      <Animated.View key={step} entering={enter} exiting={exit} style={StyleSheet.absoluteFill}>
        <Step id={step} />
      </Animated.View>
    </View>
  );
}

function Step({ id }: { id: StepId }) {
  const flow = useOnboardingFlow();
  const header = NO_HEADER.includes(id) ? {} : { onBack: flow.back, progress: flow.progress };
  switch (id) {
    case 'welcome':
      return <Welcome />;
    case 'name':
      return <NameStep header={header} />;
    case 'body':
      return <BodyStep header={header} />;
    case 'workouts':
      return <WorkoutsStep header={header} />;
    case 'birth':
      return <BirthStep header={header} />;
    case 'referral':
      return <ReferralStep header={header} />;
    case 'apps':
      return <YesNoStep header={header} field="triedOtherApps" title="ob.apps.title" />;
    case 'intro':
      return <IntroStep header={header} />;
    case 'height':
      return <HeightStep header={header} />;
    case 'weight':
      return <WeightStep header={header} />;
    case 'coach':
      return <YesNoStep header={header} field="hasCoach" title="ob.coach.title" subtitle="ob.coach.sub" />;
    case 'goal':
      return <GoalStep header={header} />;
    case 'health':
      return <HealthStep header={header} />;
    case 'goalWeight':
      return <GoalWeightStep header={header} />;
    case 'goalMessage':
      return <GoalMessageStep header={header} />;
    case 'pace':
      return <PaceStep header={header} />;
    case 'companion':
      return <CompanionStep header={header} />;
    case 'challenges':
      return <MultiStep header={header} field="challenges" title="ob.challenges.title" options={CHALLENGES} optional />;
    case 'diet':
      return <DietStep header={header} />;
    case 'dietNeeds':
      return <MultiStep header={header} field="dietNeeds" title="ob.dietNeeds.title" subtitle="ob.dietNeeds.sub" options={DIET_NEEDS} optional />;
    case 'motivations':
      return <MultiStep header={header} field="motivations" title="ob.motivations.title" subtitle="ob.multi" options={MOTIVATIONS} />;
    case 'milestones':
      return <MilestonesStep header={header} />;
    case 'thanks':
      return <ThanksStep header={header} />;
    case 'loading':
      return <LoadingStep />;
    case 'plan':
      return <PlanStep header={header} />;
    case 'nutrition':
      return <NutritionStep header={header} />;
    case 'routine':
      return <RoutineStep header={header} />;
    case 'beta':
      return <BetaStep header={header} />;
    case 'account':
      return <AccountStep header={header} />;
    case 'done':
      return <DoneStep />;
  }
}

type Header = { onBack?: () => void; progress?: number };

function Next({ disabled, label, testID }: { disabled?: boolean; label?: string; testID?: string }) {
  const { t } = useTranslation();
  const flow = useOnboardingFlow();
  return <PrimaryButton label={label ?? t('ob.continue')} onPress={flow.next} disabled={disabled} testID={testID ?? 'ob-next'} />;
}

// ---------- 01 Welcome ----------
function Welcome() {
  const { t } = useTranslation();
  const lang = useLocale();
  const flow = useOnboardingFlow();
  return (
    <OnboardingScreen
      footer={
        <>
          <PrimaryButton label={t('ob.welcome.cta')} onPress={flow.next} testID="ob-start" />
          {authAvailable() ? <TextButton label={t('ob.welcome.have')} strong={t('ob.welcome.signIn')} onPress={() => router.push('/auth/sign-in')} /> : null}
        </>
      }>
      <Pressable onPress={() => router.push('/language')} accessibilityRole="button" accessibilityLabel={t('common.language')} style={styles.lang}>
        <Icon name="globe-outline" size={14} color={o.text} />
        <OText variant="caption" style={styles.langText}>
          {lang.slice(0, 2).toUpperCase()}
        </OText>
      </Pressable>
      <PhonePreview />
      <View style={styles.welcomeText}>
        <OText variant="title" style={styles.centerText} accessibilityRole="header">
          {t('ob.welcome.title')}
        </OText>
        <OText variant="subtitle" style={styles.centerText}>
          {t('ob.welcome.subtitle')}
        </OText>
      </View>
    </OnboardingScreen>
  );
}

// ---------- Name ----------
function NameStep({ header }: { header: Header }) {
  const { t } = useTranslation();
  const { draft, update } = useOnboardingFlow();
  return (
    <OnboardingScreen {...header} title={t('ob.name.title')} subtitle={t('ob.name.sub')} footer={<Next disabled={!draft.name.trim()} />}>
      <TextInput
        value={draft.name}
        onChangeText={(name) => update({ name: name.slice(0, 40) })}
        placeholder={t('ob.name.placeholder')}
        placeholderTextColor={o.secondary}
        autoCapitalize="words"
        autoComplete="given-name"
        textContentType="givenName"
        returnKeyType="done"
        accessibilityLabel={t('ob.name.title')}
        style={styles.input}
        testID="ob-name"
      />
    </OnboardingScreen>
  );
}

// ---------- 02 Body (for the energy formula) ----------
function BodyStep({ header }: { header: Header }) {
  const { t } = useTranslation();
  const { draft, update } = useOnboardingFlow();
  const opts: { v: NonNullable<OnboardingDraft['bodySex']>; icon: IconName; sub?: string }[] = [
    { v: 'female', icon: 'female-outline' },
    { v: 'male', icon: 'male-outline' },
    { v: 'skip', icon: 'remove-outline', sub: t('ob.body.skipSub') },
  ];
  return (
    <OnboardingScreen {...header} title={t('ob.body.title')} subtitle={t('ob.body.sub')} footer={<Next disabled={!draft.bodySex} />}>
      {opts.map((x) => (
        <OptionCard key={x.v} icon={x.icon} label={t(`ob.body.${x.v}`)} sub={x.sub} selected={draft.bodySex === x.v} onPress={() => update({ bodySex: x.v })} />
      ))}
    </OnboardingScreen>
  );
}

// ---------- 03 Workouts ----------
const WORKOUTS: { v: NonNullable<OnboardingDraft['workouts']>; key: 'none' | 'few' | 'some' | 'many'; icon: IconName }[] = [
  { v: '0', key: 'none', icon: 'cafe-outline' },
  { v: '1-2', key: 'few', icon: 'ellipse-outline' },
  { v: '3-5', key: 'some', icon: 'barbell-outline' },
  { v: '6+', key: 'many', icon: 'flame-outline' },
];
function WorkoutsStep({ header }: { header: Header }) {
  const { t } = useTranslation();
  const { draft, update } = useOnboardingFlow();
  return (
    <OnboardingScreen {...header} title={t('ob.workouts.title')} subtitle={t('ob.workouts.sub')} footer={<Next disabled={!draft.workouts} />}>
      {WORKOUTS.map((x) => (
        <OptionCard key={x.v} icon={x.icon} label={t(`ob.workouts.${x.key}`)} sub={t(`ob.workouts.${x.key}Sub`)} selected={draft.workouts === x.v} onPress={() => update({ workouts: x.v })} />
      ))}
    </OnboardingScreen>
  );
}

// ---------- 04 Birth date ----------
function dateOrder(locale: string): ('day' | 'month' | 'year')[] {
  try {
    const parts = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).formatToParts(new Date(2000, 0, 2));
    const order = parts.map((p) => p.type).filter((p): p is 'day' | 'month' | 'year' => p === 'day' || p === 'month' || p === 'year');
    return order.length === 3 ? order : ['day', 'month', 'year'];
  } catch {
    return ['day', 'month', 'year'];
  }
}
function BirthStep({ header }: { header: Header }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const { draft, update, next } = useOnboardingFlow();
  const birth = draft.birth ?? { year: 2000, month: 1, day: 1 };
  const years = useMemo(() => Array.from({ length: YEAR - 1920 + 1 }, (_, i) => 1920 + i), []);
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => new Date(2000, i, 1).toLocaleDateString(locale, { month: 'long' })), [locale]);
  const daysIn = new Date(birth.year, birth.month, 0).getDate();
  const set = (patch: Partial<typeof birth>) => {
    const b = { ...birth, ...patch };
    b.day = Math.min(b.day, new Date(b.year, b.month, 0).getDate());
    update({ birth: b });
  };
  const wheels = {
    day: (
      <WheelPicker
        key="d"
        width={64}
        items={Array.from({ length: daysIn }, (_, i) => String(i + 1))}
        index={birth.day - 1}
        onChange={(i) => set({ day: i + 1 })}
        accessibilityLabel={t('ob.birth.day')}
      />
    ),
    month: <WheelPicker key="m" items={months} index={birth.month - 1} onChange={(i) => set({ month: i + 1 })} accessibilityLabel={t('ob.birth.month')} />,
    year: <WheelPicker key="y" width={92} items={years.map(String)} index={years.indexOf(birth.year)} onChange={(i) => set({ year: years[i] })} accessibilityLabel={t('ob.birth.year')} />,
  };
  const onContinue = () => {
    if (!draft.birth) update({ birth });
    if (ageOn(birth, new Date()) < 18) return router.push('/adults-only');
    next();
  };
  return (
    <OnboardingScreen {...header} title={t('ob.birth.title')} subtitle={t('ob.birth.sub')} footer={<PrimaryButton label={t('ob.continue')} onPress={onContinue} testID="ob-next" />}>
      <View style={styles.wheels}>{dateOrder(locale).map((k) => wheels[k])}</View>
    </OnboardingScreen>
  );
}

// ---------- 05 Referral (optional) ----------
const REFERRALS: { v: 'tiktok' | 'instagram' | 'youtube' | 'appStore' | 'friends' | 'other'; icon: IconName }[] = [
  { v: 'tiktok', icon: 'logo-tiktok' },
  { v: 'instagram', icon: 'logo-instagram' },
  { v: 'youtube', icon: 'logo-youtube' },
  { v: 'appStore', icon: 'logo-apple-appstore' },
  { v: 'friends', icon: 'people-outline' },
  { v: 'other', icon: 'search-outline' },
];
function ReferralStep({ header }: { header: Header }) {
  const { t } = useTranslation();
  const { draft, update } = useOnboardingFlow();
  return (
    <OnboardingScreen {...header} title={t('ob.referral.title')} subtitle={t('ob.referral.sub')} footer={<Next />}>
      {REFERRALS.map((x) => (
        <OptionCard key={x.v} icon={x.icon} label={t(`ob.referral.${x.v}`)} selected={draft.referral === x.v} onPress={() => update({ referral: draft.referral === x.v ? undefined : x.v })} />
      ))}
    </OnboardingScreen>
  );
}

// ---------- Yes / no (06, 10) ----------
function YesNoStep({ header, field, title, subtitle }: { header: Header; field: 'triedOtherApps' | 'hasCoach'; title: 'ob.apps.title' | 'ob.coach.title'; subtitle?: 'ob.coach.sub' }) {
  const { t } = useTranslation();
  const { draft, update } = useOnboardingFlow();
  return (
    <OnboardingScreen {...header} title={t(title)} subtitle={subtitle ? t(subtitle) : undefined} footer={<Next disabled={draft[field] === undefined} />}>
      <OptionCard icon="thumbs-up-outline" label={t('ob.yes')} selected={draft[field] === true} onPress={() => update({ [field]: true })} />
      <OptionCard icon="thumbs-down-outline" label={t('ob.no')} selected={draft[field] === false} onPress={() => update({ [field]: false })} />
    </OnboardingScreen>
  );
}

// ---------- 07 Intro ----------
function IntroStep({ header }: { header: Header }) {
  const { t } = useTranslation();
  return (
    <OnboardingScreen {...header} title={t('ob.intro.title')} footer={<Next />}>
      <SoftCard style={styles.routineCard}>
        <View style={styles.routineHead}>
          <PrimeCharacter variant="today" size={72} radius={16} />
          <OText variant="body" style={styles.flex}>
            {t('ob.intro.note')}
          </OText>
        </View>
        {(['row1', 'row2', 'row3'] as const).map((r, i) => (
          <View key={r} style={styles.routineRow}>
            <View style={[styles.check, i === 2 && styles.checkDark]}>
              <Icon name={i === 2 ? 'checkmark' : i === 0 ? 'restaurant-outline' : 'barbell-outline'} size={16} color={i === 2 ? '#FFFFFF' : o.text} />
            </View>
            <OText variant="option">{t(`ob.intro.${r}`)}</OText>
          </View>
        ))}
      </SoftCard>
    </OnboardingScreen>
  );
}

// ---------- 08 Height ----------
function HeightStep({ header }: { header: Header }) {
  const { t } = useTranslation();
  const { draft, update } = useOnboardingFlow();
  const [manual, setManual] = useState(false);
  const cms = useMemo(() => Array.from({ length: 230 - 120 + 1 }, (_, i) => 120 + i), []);
  const ftin = cmToFtIn(draft.heightCm);
  return (
    <OnboardingScreen {...header} title={t('ob.height.title')} subtitle={t('ob.height.sub')} footer={<Next disabled={!(draft.heightCm >= 120 && draft.heightCm <= 230)} />}>
      <UnitSwitch
        value={draft.units}
        options={[
          { value: 'imperial', label: 'ft, in' },
          { value: 'metric', label: 'cm' },
        ]}
        onChange={(units) => update({ units })}
      />
      {manual ? (
        <TextInput
          defaultValue={String(draft.heightCm)}
          keyboardType="number-pad"
          onChangeText={(v) => {
            const n = Number(v);
            if (n >= 120 && n <= 230) update({ heightCm: Math.round(n) });
          }}
          accessibilityLabel={`${t('ob.height.title')} (cm)`}
          style={[styles.input, styles.centerText]}
        />
      ) : draft.units === 'metric' ? (
        <View style={styles.wheels}>
          <WheelPicker items={cms.map((c) => `${c} cm`)} index={cms.indexOf(draft.heightCm)} onChange={(i) => update({ heightCm: cms[i] })} accessibilityLabel={t('ob.height.title')} />
        </View>
      ) : (
        <View style={styles.wheels}>
          <WheelPicker
            items={['4 ft', '5 ft', '6 ft', '7 ft']}
            index={Math.max(0, Math.min(3, ftin.ft - 4))}
            onChange={(i) => update({ heightCm: Math.min(230, Math.max(120, ftInToCm(i + 4, ftin.in))) })}
            accessibilityLabel={`${t('ob.height.title')} ft`}
          />
          <WheelPicker
            items={Array.from({ length: 12 }, (_, i) => `${i} in`)}
            index={ftin.in}
            onChange={(i) => update({ heightCm: Math.min(230, Math.max(120, ftInToCm(ftin.ft, i))) })}
            accessibilityLabel={`${t('ob.height.title')} in`}
          />
        </View>
      )}
      <TextButton label={manual ? t('ob.useWheel') : t('ob.enterManually')} onPress={() => setManual(!manual)} />
    </OnboardingScreen>
  );
}

// ---------- Weight scale (09 and 12) ----------
function WeightInput({ kg, onKg, label }: { kg: number; onKg: (kg: number) => void; label: string }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const { draft, update } = useOnboardingFlow();
  const [manual, setManual] = useState(false);
  const metric = draft.units === 'metric';
  const shown = metric ? kg : kgToLb(kg);
  const fmt = (v: number) => `${num(v, locale)} ${metric ? 'kg' : 'lbs'}`;
  return (
    <View style={styles.weightBox}>
      <UnitSwitch
        value={draft.units}
        options={[
          { value: 'imperial', label: 'lbs' },
          { value: 'metric', label: 'kg' },
        ]}
        onChange={(units) => update({ units })}
      />
      <OText variant="caption" style={styles.centerText}>
        {label}
      </OText>
      <OText variant="big" style={styles.centerText} accessibilityLiveRegion="polite">
        {fmt(shown)}
      </OText>
      {manual ? (
        <TextInput
          defaultValue={num(shown, 'en').replace(',', '.')}
          keyboardType="decimal-pad"
          onChangeText={(v) => {
            const n = Number(v.replace(',', '.'));
            const k = metric ? n : lbToKg(n);
            if (k >= 30 && k <= 300) onKg(Math.round(k * 10) / 10);
          }}
          accessibilityLabel={label}
          style={[styles.input, styles.centerText]}
        />
      ) : (
        <WeightRuler
          key={draft.units}
          value={shown}
          min={metric ? 30 : 66}
          max={metric ? 300 : 660}
          step={metric ? 0.1 : 0.2}
          onChange={(v) => onKg(metric ? v : lbToKg(v))}
          accessibilityLabel={label}
          format={fmt}
        />
      )}
      <TextButton label={manual ? t('ob.useScale') : t('ob.enterManually')} onPress={() => setManual(!manual)} />
    </View>
  );
}

function WeightStep({ header }: { header: Header }) {
  const { t } = useTranslation();
  const { draft, update } = useOnboardingFlow();
  return (
    <OnboardingScreen {...header} title={t('ob.weight.title')} subtitle={t('ob.weight.sub')} footer={<Next />}>
      <WeightInput kg={draft.weightKg} onKg={(weightKg) => update({ weightKg })} label={t('ob.weight.current')} />
    </OnboardingScreen>
  );
}

// ---------- 11 Goal ----------
function GoalStep({ header }: { header: Header }) {
  const { t } = useTranslation();
  const { draft, update } = useOnboardingFlow();
  const goals: { v: NonNullable<OnboardingDraft['goal']>; icon: IconName }[] = [
    { v: 'lose', icon: 'arrow-down' },
    { v: 'maintain', icon: 'remove' },
    { v: 'fitter', icon: 'pulse-outline' },
  ];
  return (
    <OnboardingScreen {...header} title={t('ob.goal.title')} subtitle={t('ob.goal.sub')} footer={<Next disabled={!draft.goal} />}>
      {goals.map((g) => (
        <OptionCard
          key={g.v}
          icon={g.icon}
          label={t(`ob.goal.${g.v}`)}
          selected={draft.goal === g.v}
          onPress={() => update({ goal: g.v, goalWeightKg: g.v === 'lose' ? (draft.goalWeightKg ?? Math.round(draft.weightKg * 0.9)) : draft.goalWeightKg })}
        />
      ))}
    </OnboardingScreen>
  );
}

// ---------- 11b Health check (weight loss only) ----------
const HEALTH: { v: string; icon: IconName }[] = [
  { v: 'pregnant', icon: 'heart-outline' },
  { v: 'eatingDisorder', icon: 'restaurant-outline' },
  { v: 'condition', icon: 'medkit-outline' },
  { v: 'medication', icon: 'bandage-outline' },
  { v: 'none', icon: 'checkmark-circle-outline' },
];
function HealthStep({ header }: { header: Header }) {
  const { t } = useTranslation();
  const { draft, update } = useOnboardingFlow();
  const list = draft.healthFlags ?? [];
  const toggle = (v: string) =>
    update({ healthFlags: v === 'none' ? (list.includes('none') ? [] : ['none']) : list.includes(v) ? list.filter((x) => x !== v) : [...list.filter((x) => x !== 'none'), v] });
  return (
    <OnboardingScreen {...header} title={t('ob.health.title')} subtitle={t('ob.health.sub')} footer={<Next disabled={list.length === 0} />} scroll>
      {HEALTH.map((x) => (
        <OptionCard key={x.v} multi icon={x.icon} label={t(`ob.health.${x.v}` as 'ob.health.none')} selected={list.includes(x.v)} onPress={() => toggle(x.v)} />
      ))}
      {healthRisk(draft) ? <OText variant="body">{t('ob.health.risk')}</OText> : null}
      <OText variant="caption">{t('ob.health.privacy')}</OText>
    </OnboardingScreen>
  );
}

// ---------- 12 Goal weight ----------
function GoalWeightStep({ header }: { header: Header }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const { draft, update } = useOnboardingFlow();
  const goalKg = draft.goalWeightKg ?? Math.round(draft.weightKg * 0.9);
  const check = checkGoalWeight(goalKg, draft.weightKg, draft.heightCm);
  const unhealthy = !check.ok && (check.reason === 'underweight' || check.reason === 'invalid');
  const notLower = goalKg >= draft.weightKg;
  const metric = draft.units === 'metric';
  const show = (kg: number) => `${num(metric ? kg : kgToLb(kg), locale)} ${metric ? 'kg' : 'lbs'}`;
  return (
    <OnboardingScreen {...header} title={t('ob.goalWeight.title')} footer={<Next disabled={unhealthy || notLower} />}>
      <WeightInput kg={goalKg} onKg={(goalWeightKg) => update({ goalWeightKg })} label={t('ob.goal.lose')} />
      <OText variant="body" style={styles.centerText} accessibilityLiveRegion="polite">
        {notLower
          ? t('ob.goalWeight.notLower')
          : unhealthy && !check.ok && check.reason === 'underweight'
            ? t('onboarding.goals.underweight', { min: show(check.minHealthyKg ?? 0) })
            : t('ob.goalWeight.diff', { value: show(Math.round((draft.weightKg - goalKg) * 10) / 10) })}
      </OText>
      {!check.ok && check.reason === 'large_change' ? (
        <OText variant="caption" style={styles.centerText}>
          {t('onboarding.goals.largeChange')}
        </OText>
      ) : null}
    </OnboardingScreen>
  );
}

// ---------- 13 Goal message ----------
function GoalMessageStep({ header }: { header: Header }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const { draft } = useOnboardingFlow();
  const plan = planFor(draft);
  const metric = draft.units === 'metric';
  const kg = plan.toLoseKg && plan.toLoseKg > 0 ? `${num(metric ? plan.toLoseKg : kgToLb(plan.toLoseKg), locale)} ${metric ? 'kg' : 'lbs'}` : null;
  return (
    <OnboardingScreen {...header} footer={<Next />} center>
      <PrimeCharacter variant="motivation" size={150} radius={24} motion="enter" />
      <OText variant="title" style={styles.centerText} accessibilityRole="header">
        {kg ? t('ob.goalMessage.withKg', { value: kg }) : t('ob.goalMessage.title')}
      </OText>
      <OText variant="subtitle" style={styles.centerText}>
        {t('ob.goalMessage.sub')}
      </OText>
    </OnboardingScreen>
  );
}

// ---------- 14 Pace ----------
const PACES = ['gentle', 'balanced', 'custom'] as const;
function PaceStep({ header }: { header: Header }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const { draft, update } = useOnboardingFlow();
  const plan = planFor(draft);
  const metric = draft.units === 'metric';
  const perWeek = plan.weeklyKg ? `${num(Math.abs(metric ? plan.weeklyKg : kgToLb(plan.weeklyKg)), locale)} ${metric ? 'kg' : 'lbs'}` : null;
  return (
    <OnboardingScreen {...header} title={t('ob.pace.title')} footer={<Next />}>
      <OText variant="caption" style={styles.centerText}>
        {t('ob.pace.perWeekLabel')}
      </OText>
      <OText variant="big" style={styles.centerText}>
        {perWeek ?? '–'}
      </OText>
      <PaceSlider
        stops={[
          { icon: 'leaf-outline', label: t('ob.pace.gentle') },
          { icon: 'walk-outline', label: t('ob.pace.balanced') },
          { icon: 'options-outline', label: t('ob.pace.custom') },
        ]}
        index={PACES.indexOf(draft.pace)}
        onChange={(i) => update({ pace: PACES[i] })}
      />
      <SoftCard>
        <OText variant="body">{t(`ob.pace.${draft.pace}Text`)}</OText>
        {plan.notes.includes('limited_by_safety') ? <OText variant="caption">{t('ob.pace.limited')}</OText> : null}
        {plan.weeks ? <OText variant="caption">{t('ob.pace.orientation', { min: plan.weeks.min, max: plan.weeks.max })}</OText> : null}
        <OText variant="caption">{plan.targets ? t('ob.pace.kcal', { value: plan.targets.kcal.toLocaleString(locale) }) : t('ob.pace.noBody')}</OText>
      </SoftCard>
    </OnboardingScreen>
  );
}

// ---------- 15 Companion ----------
function CompanionStep({ header }: { header: Header }) {
  const { t } = useTranslation();
  const rows: { icon: IconName; key: 'f1' | 'f2' | 'f3' | 'f4' }[] = [
    { icon: 'camera-outline', key: 'f1' },
    { icon: 'barbell-outline', key: 'f2' },
    { icon: 'chatbubble-ellipses-outline', key: 'f3' },
    { icon: 'stats-chart-outline', key: 'f4' },
  ];
  return (
    <OnboardingScreen {...header} title={t('ob.companion.title')} footer={<Next />}>
      <View style={styles.companion}>
        <PrimeCharacter variant="chat" size={132} radius={20} motion="enter" />
        <View style={styles.flexGap}>
          {rows.map((r) => (
            <View key={r.key} style={styles.featureRow}>
              <View style={styles.check}>
                <Icon name={r.icon} size={16} color={o.text} />
              </View>
              <OText variant="body" style={styles.flex}>
                {t(`ob.companion.${r.key}`)}
              </OText>
            </View>
          ))}
        </View>
      </View>
    </OnboardingScreen>
  );
}

// ---------- Multi-select (16, dietNeeds, 18) ----------
type MultiField = 'challenges' | 'dietNeeds' | 'motivations';
const CHALLENGES: { v: string; icon: IconName }[] = [
  { v: 'consistency', icon: 'repeat-outline' },
  { v: 'planning', icon: 'calendar-outline' },
  { v: 'support', icon: 'people-outline' },
  { v: 'time', icon: 'time-outline' },
  { v: 'ideas', icon: 'bulb-outline' },
];
const DIET_NEEDS: { v: string; icon: IconName }[] = [
  { v: 'halal', icon: 'moon-outline' },
  { v: 'lactose', icon: 'water-outline' },
  { v: 'gluten', icon: 'nutrition-outline' },
  { v: 'nuts', icon: 'alert-circle-outline' },
];
const MOTIVATIONS: { v: string; icon: IconName }[] = [
  { v: 'healthier', icon: 'heart-outline' },
  { v: 'energy', icon: 'sunny-outline' },
  { v: 'training', icon: 'barbell-outline' },
  { v: 'comfortable', icon: 'happy-outline' },
];
function MultiStep({
  header,
  field,
  title,
  subtitle,
  options,
  optional,
}: {
  header: Header;
  field: MultiField;
  title: 'ob.challenges.title' | 'ob.dietNeeds.title' | 'ob.motivations.title';
  subtitle?: 'ob.dietNeeds.sub' | 'ob.multi';
  options: { v: string; icon: IconName }[];
  optional?: boolean;
}) {
  const { t } = useTranslation();
  const { draft, update } = useOnboardingFlow();
  const list = draft[field];
  const ns = field === 'challenges' ? 'ob.challenges' : field === 'dietNeeds' ? 'ob.dietNeeds' : 'ob.motivations';
  return (
    <OnboardingScreen {...header} title={t(title)} subtitle={t(subtitle ?? 'ob.multi')} footer={<Next disabled={!optional && list.length === 0} />}>
      {options.map((x) => (
        <OptionCard
          key={x.v}
          multi
          icon={x.icon}
          label={t(`${ns}.${x.v}` as 'ob.challenges.time')}
          selected={list.includes(x.v)}
          onPress={() => update({ [field]: list.includes(x.v) ? list.filter((y) => y !== x.v) : [...list, x.v] })}
        />
      ))}
    </OnboardingScreen>
  );
}

// ---------- 17 Diet ----------
const DIETS: { v: string; icon: IconName }[] = [
  { v: 'none', icon: 'restaurant-outline' },
  { v: 'mediterranean', icon: 'sunny-outline' },
  { v: 'flexitarian', icon: 'swap-horizontal-outline' },
  { v: 'pescatarian', icon: 'fish-outline' },
  { v: 'vegetarian', icon: 'leaf-outline' },
  { v: 'vegan', icon: 'flower-outline' },
  { v: 'other', icon: 'ellipsis-horizontal' },
];
function DietStep({ header }: { header: Header }) {
  const { t } = useTranslation();
  const { draft, update } = useOnboardingFlow();
  return (
    <OnboardingScreen {...header} title={t('ob.diet.title')} footer={<Next disabled={!draft.diet} />}>
      <View style={styles.compactList}>
        {DIETS.map((x) => (
          <OptionCard key={x.v} icon={x.icon} label={t(`ob.diet.${x.v}` as 'ob.diet.none')} selected={draft.diet === x.v} onPress={() => update({ diet: x.v })} />
        ))}
      </View>
    </OnboardingScreen>
  );
}

// ---------- 19 Milestones (illustration) ----------
function MilestonesStep({ header }: { header: Header }) {
  const { t } = useTranslation();
  return (
    <OnboardingScreen {...header} title={t('ob.milestones.title')} footer={<Next />}>
      <SoftCard>
        <View aria-hidden>
          <Svg width="100%" height={150} viewBox="0 0 300 150">
            <Path d="M 16 128 C 70 126, 100 110, 140 84 S 230 30, 284 22" stroke={o.text} strokeWidth={2.5} fill="none" />
            <Path d="M 16 128 C 70 126, 100 110, 140 84 S 230 30, 284 22 L 284 140 L 16 140 Z" fill={o.border} opacity={0.5} />
            {[
              [16, 128],
              [140, 84],
              [284, 22],
            ].map(([x, y], i) => (
              <Circle key={i} cx={x} cy={y} r={7} fill={i === 2 ? o.text : '#FFFFFF'} stroke={o.text} strokeWidth={2} />
            ))}
          </Svg>
        </View>
        <View style={styles.milestoneLabels}>
          {(['m1', 'm2', 'm3'] as const).map((m) => (
            <OText key={m} variant="caption" style={styles.milestoneLabel}>
              {t(`ob.milestones.${m}`)}
            </OText>
          ))}
        </View>
        <OText variant="caption" style={styles.centerText}>
          {t('ob.milestones.note')}
        </OText>
      </SoftCard>
    </OnboardingScreen>
  );
}

// ---------- 20 Thanks + consent ----------
function ThanksStep({ header }: { header: Header }) {
  const { t } = useTranslation();
  const { draft, update } = useOnboardingFlow();
  return (
    <OnboardingScreen {...header} footer={<Next />} scroll>
      <View style={styles.thanks}>
        <PrimeCharacter variant="success" size={132} radius={66} motion="enter" />
        <OText variant="title" style={styles.centerText} accessibilityRole="header">
          {t('ob.thanks.title')}
        </OText>
        <OText variant="subtitle" style={styles.centerText}>
          {t('ob.thanks.sub')}
        </OText>
      </View>
      <SoftCard>
        <OText variant="option">{t('ob.thanks.cardTitle')}</OText>
        <OText variant="caption">{t('ob.thanks.cardBody')}</OText>
        <OText variant="caption">{t('ob.thanks.privacy')}</OText>
      </SoftCard>
      <View style={styles.consent}>
        <View style={styles.flex}>
          <OText variant="body">{t('ob.thanks.consent')}</OText>
          <OText variant="caption">{t('ob.thanks.consentHint')}</OText>
        </View>
        <Switch value={draft.coachConsent} onValueChange={(coachConsent) => update({ coachConsent })} trackColor={{ true: o.text, false: o.border }} accessibilityLabel={t('ob.thanks.consent')} />
      </View>
    </OnboardingScreen>
  );
}

// ---------- 21 Loading (real steps, no artificial wait beyond a short reveal) ----------
const LOAD_STEPS = ['s1', 's2', 's3', 's4', 's5'] as const;
function LoadingStep() {
  const { t } = useTranslation();
  const { draft, next } = useOnboardingFlow();
  const reduced = useReducedMotion();
  const [done, setDone] = useState(0);
  useEffect(() => {
    let cancelled = false;
    // Each step does its real work (validate, compute energy, macros, routine, assemble); the short
    // pause only lets the user see the step complete.
    const work: (() => void)[] = [
      () => void (draft.birth && draft.heightCm && draft.weightKg),
      () => void planFor(draft).tdee,
      () => void planFor(draft).targets,
      () => void draft.workouts,
      () => void planFor(draft),
    ];
    (async () => {
      for (let i = 0; i < work.length; i++) {
        work[i]();
        await new Promise((r) => setTimeout(r, reduced ? 80 : 380));
        if (cancelled) return;
        setDone(i + 1);
      }
      await new Promise((r) => setTimeout(r, reduced ? 80 : 350));
      if (!cancelled) next();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per visit
  }, []);
  const pct = Math.round((done / LOAD_STEPS.length) * 100);
  return (
    <OnboardingScreen center>
      <OText variant="big" style={styles.huge} accessibilityLiveRegion="polite">
        {pct}%
      </OText>
      <OText variant="title" style={styles.centerText}>
        {t('ob.loading.title')}
      </OText>
      <View style={styles.loadTrack}>
        <View style={[styles.loadFill, { width: `${pct}%` }]} />
      </View>
      <SoftCard style={styles.loadCard}>
        {LOAD_STEPS.map((k, i) => (
          <View key={k} style={styles.loadRow}>
            <OText variant="body" style={[styles.flex, i >= done && styles.muted]}>
              {t(`ob.loading.${k}`)}
            </OText>
            {i < done ? <Icon name="checkmark-circle" size={22} color={o.text} /> : i === done ? <ActivityIndicator size="small" color={o.secondary} /> : null}
          </View>
        ))}
      </SoftCard>
    </OnboardingScreen>
  );
}

// ---------- 22 Plan ----------
function PlanStep({ header }: { header: Header }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const { draft, goTo } = useOnboardingFlow();
  const plan = planFor(draft);
  const metric = draft.units === 'metric';
  const w = (kg: number) => `${num(metric ? kg : kgToLb(kg), locale)} ${metric ? 'kg' : 'lbs'}`;
  const rows: [string, string][] = [
    [t('ob.plan.goal'), t(`ob.goal.${draft.goal ?? 'fitter'}`)],
    [t('ob.plan.start'), w(draft.weightKg)],
  ];
  if (draft.goal === 'lose' && draft.goalWeightKg && !healthRisk(draft)) rows.push([t('ob.plan.target'), w(draft.goalWeightKg)]);
  if (plan.weeks) rows.push([t('ob.plan.orientation'), t('ob.plan.weeksRange', { min: plan.weeks.min, max: plan.weeks.max })]);
  return (
    <OnboardingScreen {...header} footer={<Next />} scroll>
      <View style={styles.planHead}>
        <View style={styles.planCheck}>
          <Icon name="checkmark" size={22} color="#FFFFFF" />
        </View>
        <OText variant="title" style={styles.centerText} accessibilityRole="header">
          {t('ob.plan.title')}
        </OText>
      </View>
      {draft.goal === 'lose' && plan.toLoseKg && !healthRisk(draft) ? (
        <SoftCard>
          <View aria-hidden>
            <Svg width="100%" height={110} viewBox="0 0 300 110">
              <Path d="M 14 18 C 90 20, 150 40, 190 70 S 260 96, 286 96" stroke={o.text} strokeWidth={2.5} fill="none" />
              <Circle cx={14} cy={18} r={6} fill="#FFFFFF" stroke={o.text} strokeWidth={2} />
              <Circle cx={286} cy={96} r={6} fill={o.text} />
            </Svg>
          </View>
          <View style={styles.chartLabels}>
            <OText variant="caption">{t('ob.plan.chartStart')}</OText>
            <OText variant="caption">{t('ob.plan.chartGoal')}</OText>
          </View>
        </SoftCard>
      ) : null}
      <SoftCard>
        {rows.map(([k, v]) => (
          <View key={k} style={styles.planRow}>
            <OText variant="caption" style={styles.flex}>
              {k}
            </OText>
            <OText variant="option">{v}</OText>
          </View>
        ))}
        <OText variant="caption">{t('ob.plan.estimate')}</OText>
      </SoftCard>
      {plan.notes.includes('needs_professional') ? (
        <SoftCard>
          <OText variant="body">{t('ob.health.planNote')}</OText>
        </SoftCard>
      ) : null}
      <TextButton label={t('ob.plan.edit')} onPress={() => goTo('goal')} />
    </OnboardingScreen>
  );
}

// ---------- 23 Nutrition ----------
function NutritionStep({ header }: { header: Header }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const { draft, goTo } = useOnboardingFlow();
  const plan = planFor(draft);
  const tg = plan.targets;
  return (
    <OnboardingScreen {...header} title={t('ob.nutrition.title')} subtitle={t('ob.nutrition.sub')} footer={<Next />}>
      {tg ? (
        <>
          <View style={styles.kcalCard}>
            <View style={styles.check}>
              <Icon name="flame-outline" size={18} color={o.text} />
            </View>
            <View>
              <OText variant="big">{tg.kcal.toLocaleString(locale)}</OText>
              <OText variant="caption">{t('ob.nutrition.kcal')}</OText>
            </View>
          </View>
          <View style={styles.macros}>
            {(['protein', 'carbs', 'fat'] as const).map((m) => (
              <View key={m} style={styles.macro}>
                <OText variant="option" style={styles.tabular}>
                  {tg[m]} g
                </OText>
                <OText variant="caption" numberOfLines={1} adjustsFontSizeToFit>
                  {t(`food.short.${m}`)}
                </OText>
              </View>
            ))}
          </View>
        </>
      ) : (
        <SoftCard>
          <OText variant="body">{t('ob.nutrition.missing')}</OText>
          <TextButton label={t('ob.nutrition.complete')} onPress={() => goTo('body')} />
        </SoftCard>
      )}
      <View style={styles.planRow}>
        <OText variant="caption" style={styles.flex}>
          {t('ob.nutrition.water')}
        </OText>
        <OText variant="option">{num(plan.waterMl / 1000, locale)} l</OText>
      </View>
      <OText variant="caption">{t('ob.nutrition.note')}</OText>
    </OnboardingScreen>
  );
}

// ---------- 24 Routine ----------
function RoutineStep({ header }: { header: Header }) {
  const { t } = useTranslation();
  const { draft } = useOnboardingFlow();
  const workout = WORKOUTS.find((w) => w.v === draft.workouts);
  return (
    <OnboardingScreen {...header} title={t('ob.routine.title')} footer={<Next />} scroll>
      <SoftCard>
        <View style={styles.planRow}>
          <OText variant="caption" style={styles.flex}>
            {t('ob.routine.training')}
          </OText>
          <OText variant="option">{workout ? t(`ob.workouts.${workout.key}`) : '–'}</OText>
        </View>
        <View style={styles.planRow}>
          <OText variant="caption" style={styles.flex}>
            {t('ob.routine.diet')}
          </OText>
          <OText variant="option">{draft.diet ? t(`ob.diet.${draft.diet}` as 'ob.diet.none') : '–'}</OText>
        </View>
      </SoftCard>
      <View style={styles.routineHead}>
        <PrimeCharacter variant="kitchen" size={96} radius={18} />
        <View style={styles.flexGap}>
          <OText variant="option">{t('ob.routine.daily')}</OText>
          <OText variant="body">1. {t('ob.routine.task1')}</OText>
          <OText variant="body">2. {t('ob.routine.task2')}</OText>
        </View>
      </View>
      <OText variant="caption">{t('ob.routine.optional')}</OText>
      <OText variant="caption">{t('ob.routine.prime')}</OText>
    </OnboardingScreen>
  );
}

// ---------- 25 PrimeMe+ Beta ----------
function BetaStep({ header }: { header: Header }) {
  const { t } = useTranslation();
  const features = ['f1', 'f2', 'f3', 'f4', 'f5', 'f6'] as const;
  return (
    <OnboardingScreen {...header} footer={<Next label={t('ob.beta.cta')} />} scroll>
      <View style={styles.thanks}>
        <PrimeCharacter variant="motivation" size={120} radius={24} motion="enter" />
        <OText variant="title" style={styles.centerText} accessibilityRole="header">
          {t('ob.beta.title')}
        </OText>
      </View>
      <SoftCard>
        {features.map((f) => (
          <View key={f} style={styles.featureRow}>
            <Icon name="checkmark" size={18} color={o.text} />
            <OText variant="body" style={styles.flex}>
              {t(`ob.beta.${f}`)}
            </OText>
          </View>
        ))}
      </SoftCard>
      {(['c1', 'c2', 'c3'] as const).map((c) => (
        <View key={c} style={styles.featureRow}>
          <Icon name="checkmark-circle-outline" size={18} color={o.text} />
          <OText variant="caption" style={styles.flex}>
            {t(`ob.beta.${c}`)}
          </OText>
        </View>
      ))}
    </OnboardingScreen>
  );
}

// ---------- 26 Account ----------
function AccountStep({ header }: { header: Header }) {
  const { t } = useTranslation();
  const auth = useAuth();
  const { next } = useOnboardingFlow();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AuthErrorCode | null>(null);
  const available = authAvailable();

  // Any way of signing in (email, Apple, existing account) continues the flow.
  useEffect(() => {
    if (auth.status === 'signedIn') next();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- advance once when signed in
  }, [auth.status]);

  const submit = async () => {
    if (!validEmail(email)) return setError('invalid_email');
    if (password.length < PASSWORD_MIN) return setError('weak_password');
    setBusy(true);
    setError(null);
    const r = await signUp(email, password);
    setBusy(false);
    if (!r.ok) return setError(r.error);
    // Signed in at once (no confirmation email); the effect above moves on to the last screen.
  };

  if (!available) {
    return <OnboardingScreen {...header} title={t('ob.account.title')} subtitle={t('ob.account.noAuth')} footer={<PrimaryButton label={t('ob.account.continueWithout')} onPress={next} />} />;
  }
  return (
    <OnboardingScreen
      {...header}
      title={t('ob.account.title')}
      subtitle={t('ob.account.sub')}
      scroll
      footer={
        <>
          <PrimaryButton label={busy ? t('ob.account.creating') : t('ob.account.create')} onPress={() => void submit()} disabled={busy || !email || !password} testID="ob-create" />
          <TextButton label={t('ob.account.have')} strong={t('ob.welcome.signIn')} onPress={() => router.push({ pathname: '/auth/sign-in', params: { email } })} />
        </>
      }>
      <AppleSignIn type="continue" onError={setError} onSignedIn={() => undefined} />
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder={t('auth.email')}
        placeholderTextColor={o.secondary}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        accessibilityLabel={t('auth.email')}
        style={styles.input}
        testID="ob-email"
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder={t('auth.password')}
        placeholderTextColor={o.secondary}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        accessibilityLabel={t('auth.password')}
        style={styles.input}
        testID="ob-password"
      />
      <OText variant="caption">{t('auth.passwordHint')}</OText>
      <AuthError code={error} />
    </OnboardingScreen>
  );
}

// ---------- 27 Done: save the plan to the account, then the dashboard ----------
function DoneStep() {
  const { t } = useTranslation();
  const { draft } = useOnboardingFlow();
  const { data, dispatch, today } = useAppState();
  const auth = useAuth();
  const sync = useSync();
  const [saving, setSaving] = useState(false);
  const userId = auth.status === 'signedIn' ? (auth.user?.id ?? null) : null;
  // Wait for the account's first sync, so an existing profile is loaded – never overwritten.
  const synced = !userId || (sync.owner === userId && !!sync.lastSyncAt);
  const existing = !!data.profile;
  const beta = sync.entitlement?.source === 'beta';

  useEffect(() => {
    if (userId && !synced) void sync.syncNow();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per account
  }, [userId]);

  const finish = async () => {
    if (existing) {
      await clearDraft();
      return router.replace('/today');
    }
    setSaving(true);
    const plan = planFor(draft);
    const now = nowISO();
    const restrictions = [
      draft.diet && draft.diet !== 'none' && draft.diet !== 'other' ? t(`ob.diet.${draft.diet}` as 'ob.diet.none') : null,
      ...draft.dietNeeds.filter((n) => n !== 'nuts').map((n) => t(`ob.dietNeeds.${n}` as 'ob.dietNeeds.halal')),
    ].filter((x): x is string => !!x);
    const profile: Profile = {
      name: draft.name.trim(),
      adultConfirmed: true,
      units: draft.units,
      heightCm: draft.heightCm,
      goals: draft.goal === 'lose' ? ['weight'] : draft.goal === 'maintain' ? ['weight', 'habits'] : ['active'],
      startWeightKg: draft.weightKg,
      goalWeightKg: draft.goal === 'lose' && !healthRisk(draft) ? draft.goalWeightKg : undefined,
      activityPrefs: [],
      food: { preferred: [], restrictions, allergies: draft.dietNeeds.includes('nuts') ? [t('ob.dietNeeds.nuts')] : [], dislikes: [] },
      planningTime: '20:30',
      createdAt: now,
      onboardingCompletedAt: now,
      waterGoalMl: plan.waterMl,
      targets: plan.targets ?? undefined,
      bodySex: draft.bodySex === 'skip' ? undefined : draft.bodySex,
      birthYear: draft.birth?.year,
      primaryGoal: draft.goal,
      workoutsPerWeek: draft.workouts,
      pace: draft.goal === 'lose' ? draft.pace : undefined,
      challenges: draft.challenges,
      motivations: draft.motivations,
      diet: draft.diet,
      triedOtherApps: draft.triedOtherApps,
      hasCoach: draft.hasCoach,
      referral: draft.referral,
      healthFlags: draft.goal === 'lose' ? draft.healthFlags.filter((f) => f !== 'none') : undefined,
    };
    const r = await dispatch({
      type: 'completeOnboarding',
      profile,
      journey: { programEnabled: true, startDate: today, maintenance: false },
      notifications: { ...defaultNotifications(), enabled: false },
    });
    if (r.ok) {
      await dispatch({ type: 'upsertWeight', entry: { id: `w_${today}`, date: today, kg: draft.weightKg, createdAt: now, updatedAt: now } });
      if (draft.coachConsent) await dispatch({ type: 'setCoachConsent', value: true });
      await clearDraft();
      // Beta (mode A) or Pro already (founder, restored purchase): straight to Today. Otherwise
      // (commercial mode) the PrimeMe+ offer once – "continue with PrimeMe Free" leads to Today.
      if (userId && sync.entitlement?.tier !== 'pro') router.replace({ pathname: '/pro', params: { from: 'onboarding' } });
      else router.replace('/today');
    }
    setSaving(false);
  };

  return (
    <OnboardingScreen center footer={<PrimaryButton label={t('ob.done.cta')} onPress={() => void finish()} disabled={!synced || saving} testID="ob-finish" />}>
      <PrimeCharacter variant="welcome" size={180} radius={28} motion="idle" />
      <OText variant="title" style={styles.centerText} accessibilityRole="header">
        {existing ? t('ob.done.existing') : t('ob.done.title')}
      </OText>
      <OText variant="subtitle" style={styles.centerText}>
        {synced ? t('ob.done.sub') : t('ob.done.saving')}
      </OText>
      {beta ? (
        <View style={styles.betaPill}>
          <Icon name="star" size={14} color="#FFFFFF" />
          <OText variant="caption" style={styles.betaText}>
            {t('ob.done.beta')}
          </OText>
        </View>
      ) : null}
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  blank: { flex: 1, backgroundColor: o.background },
  flex: { flex: 1 },
  flexGap: { flex: 1, gap: 10 },
  centerText: { textAlign: 'center' },
  lang: { position: 'absolute', top: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 30, borderRadius: 15, backgroundColor: o.soft, zIndex: 2 },
  langText: { color: o.text, fontWeight: '600' },
  welcomeText: { gap: 4, marginTop: 8 },
  input: { height: 58, borderRadius: 16, borderWidth: 1.5, borderColor: o.border, paddingHorizontal: 18, fontSize: 18, color: o.text, backgroundColor: o.card },
  wheels: { flexDirection: 'row', gap: 8, alignSelf: 'stretch' },
  weightBox: { gap: 10 },
  routineCard: { gap: 14 },
  routineHead: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  routineRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  check: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: o.border, alignItems: 'center', justifyContent: 'center' },
  checkDark: { backgroundColor: o.text, borderColor: o.text },
  companion: { gap: 20, alignItems: 'center' },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 34 },
  compactList: { gap: 8 },
  milestoneLabels: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  milestoneLabel: { flex: 1, textAlign: 'center', color: o.text },
  thanks: { alignItems: 'center', gap: 10, marginBottom: 8 },
  consent: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderColor: o.border, borderRadius: 16, padding: 16 },
  huge: { fontSize: 64, lineHeight: 72, textAlign: 'center' },
  loadTrack: { alignSelf: 'stretch', height: 6, borderRadius: 3, backgroundColor: o.border, overflow: 'hidden' },
  loadFill: { height: 6, borderRadius: 3, backgroundColor: o.text },
  loadCard: { alignSelf: 'stretch', marginTop: 12 },
  loadRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 32 },
  muted: { color: o.secondary },
  planHead: { alignItems: 'center', gap: 12, marginBottom: 8 },
  planCheck: { width: 44, height: 44, borderRadius: 22, backgroundColor: o.text, alignItems: 'center', justifyContent: 'center' },
  chartLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 36 },
  kcalCard: { flexDirection: 'row', alignItems: 'center', gap: 16, borderWidth: 1.5, borderColor: o.border, borderRadius: 18, padding: 18 },
  macros: { flexDirection: 'row', gap: 10 },
  macro: { flex: 1, borderWidth: 1.5, borderColor: o.border, borderRadius: 16, padding: 14, gap: 2 },
  tabular: { fontVariant: ['tabular-nums'] },
  betaPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: o.text, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  betaText: { color: '#FFFFFF', fontWeight: '600' },
});
