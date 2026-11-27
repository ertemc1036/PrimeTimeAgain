import * as Haptics from 'expo-haptics';
import { useEffect, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View, type TextProps } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Icon, type IconName } from '@/components/ui';
import { onboarding as o } from '@/theme';

export const haptic = () => {
  if (Platform.OS !== 'web') void Haptics.selectionAsync();
};

type Variant = 'title' | 'subtitle' | 'option' | 'optionSub' | 'body' | 'caption' | 'big' | 'button';
/** Onboarding text in the native system font (SF Pro on iOS). */
export function OText({ variant = 'body', style, ...rest }: TextProps & { variant?: Variant }) {
  return <Text {...rest} style={[t.base, t[variant], style]} maxFontSizeMultiplier={variant === 'title' || variant === 'big' ? 1.25 : 1.5} />;
}

/** Header (back + progress), content and a fixed footer – the frame of every question screen. */
export function OnboardingScreen({
  title,
  subtitle,
  children,
  footer,
  onBack,
  progress,
  scroll = false,
  center = false,
}: {
  title?: string;
  subtitle?: string;
  children?: ReactNode;
  footer?: ReactNode;
  onBack?: () => void;
  progress?: number;
  /** Only for long optional details or large accessibility text sizes. */
  scroll?: boolean;
  /** Vertically centre the content (interstitial screens). */
  center?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { t: tr } = useTranslation();
  const body = (
    <>
      {title ? (
        <OText variant="title" accessibilityRole="header">
          {title}
        </OText>
      ) : null}
      {subtitle ? <OText variant="subtitle">{subtitle}</OText> : null}
      <View style={[s.content, center && s.center]}>{children}</View>
    </>
  );
  return (
    <KeyboardAvoidingView style={[s.root, { paddingTop: insets.top + 8 }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {onBack || progress !== undefined ? (
        <View style={s.header}>
          {onBack ? (
            <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel={tr('common.back')} hitSlop={8} style={s.back}>
              <Icon name="arrow-back" size={20} color={o.text} />
            </Pressable>
          ) : (
            <View style={s.backSpacer} />
          )}
          {progress !== undefined ? <Progress value={progress} /> : null}
        </View>
      ) : null}
      {scroll ? (
        <ScrollView style={s.flex} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {body}
        </ScrollView>
      ) : (
        <View style={[s.flex, s.scroll]}>{body}</View>
      )}
      {footer ? <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>{footer}</View> : null}
    </KeyboardAvoidingView>
  );
}

function Progress({ value }: { value: number }) {
  const reduced = useReducedMotion();
  const w = useSharedValue(value);
  useEffect(() => {
    w.set(reduced ? value : withTiming(value, { duration: 320 }));
  }, [value, reduced, w]);
  const fill = useAnimatedStyle(() => ({ width: `${Math.round(w.get() * 100)}%` }));
  return (
    <View style={s.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }}>
      <Animated.View style={[s.fill, fill]} />
    </View>
  );
}

/** Full-width pill button: black when it can continue, grey while a required answer is missing. */
export function PrimaryButton({ label, onPress, disabled, testID }: { label: string; onPress: () => void; disabled?: boolean; testID?: string }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      testID={testID}
      style={({ pressed }) => [s.button, { backgroundColor: disabled ? o.buttonDisabled : o.button, opacity: pressed ? 0.85 : 1 }]}>
      <OText variant="button">{label}</OText>
    </Pressable>
  );
}

export function TextButton({ label, onPress, strong }: { label: ReactNode; onPress: () => void; strong?: string }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" hitSlop={8} style={s.textButton}>
      <OText variant="body" style={s.textButtonLabel}>
        {label}
        {strong ? <Text style={s.strong}> {strong}</Text> : null}
      </OText>
    </Pressable>
  );
}

/** Answer card: icon in a grey circle, text, radio on the right. Selection never advances by itself. */
export function OptionCard({
  label,
  sub,
  icon,
  selected,
  onPress,
  multi,
  testID,
}: {
  label: string;
  sub?: string;
  icon?: IconName;
  selected: boolean;
  onPress: () => void;
  multi?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      onPress={() => {
        haptic();
        onPress();
      }}
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      accessibilityState={{ checked: selected }}
      accessibilityLabel={sub ? `${label}, ${sub}` : label}
      testID={testID}
      style={({ pressed }) => [s.card, selected && s.cardOn, pressed && s.cardPressed]}>
      {icon ? (
        <View style={s.cardIcon}>
          <Icon name={icon} size={20} color={o.text} />
        </View>
      ) : null}
      <View style={s.flex}>
        <OText variant="option">{label}</OText>
        {sub ? <OText variant="optionSub">{sub}</OText> : null}
      </View>
      <Radio on={selected} />
    </Pressable>
  );
}

export function Radio({ on }: { on: boolean }) {
  return <View style={[s.radio, on && s.radioOn]}>{on ? <View style={s.radioDot} /> : null}</View>;
}

/** Two-way unit switch (cm / ft in, kg / lbs). */
export function UnitSwitch<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <View style={s.units} accessibilityRole="radiogroup">
      {options.map((opt) => (
        <Pressable
          key={opt.value}
          onPress={() => {
            haptic();
            onChange(opt.value);
          }}
          accessibilityRole="radio"
          accessibilityState={{ checked: value === opt.value }}
          style={[s.unit, value === opt.value && s.unitOn]}>
          <OText variant="caption" style={value === opt.value ? s.unitTextOn : undefined}>
            {opt.label}
          </OText>
        </Pressable>
      ))}
    </View>
  );
}

/** Soft grey card used on interstitial and plan screens. */
export function SoftCard({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[s.soft, style]}>{children}</View>;
}

const t = StyleSheet.create({
  base: { color: o.text },
  title: { fontSize: 32, lineHeight: 38, fontWeight: '700', letterSpacing: -0.6 },
  subtitle: { fontSize: 16, lineHeight: 22, color: o.secondary, marginTop: 10 },
  option: { fontSize: 17, lineHeight: 22, fontWeight: '500' },
  optionSub: { fontSize: 13, lineHeight: 18, color: o.secondary, marginTop: 2 },
  body: { fontSize: 16, lineHeight: 22 },
  caption: { fontSize: 13, lineHeight: 18, color: o.secondary },
  big: { fontSize: 40, lineHeight: 46, fontWeight: '700', letterSpacing: -1, fontVariant: ['tabular-nums'] },
  button: { fontSize: 17, lineHeight: 22, fontWeight: '600', color: '#FFFFFF' },
});

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: o.background },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: o.gutter, height: 52 },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: o.soft, alignItems: 'center', justifyContent: 'center' },
  backSpacer: { width: 44, height: 44 },
  track: { flex: 1, height: 4, borderRadius: 2, backgroundColor: o.border, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2, backgroundColor: o.progress },
  scroll: { paddingHorizontal: o.gutter, paddingTop: 20, paddingBottom: 16, flexGrow: 1 },
  content: { flex: 1, justifyContent: 'center', gap: 12, paddingVertical: 16 },
  center: { alignItems: 'center' },
  footer: { paddingHorizontal: o.gutter, paddingTop: 12, backgroundColor: o.background, gap: 6 },
  button: { height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
  textButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  textButtonLabel: { textAlign: 'center' },
  strong: { fontWeight: '700', color: o.text },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: o.border,
    backgroundColor: o.card,
  },
  cardOn: { borderColor: o.selected },
  cardPressed: { opacity: 0.85 },
  cardIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: o.soft, alignItems: 'center', justifyContent: 'center' },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: '#C7C7CC', alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: o.selected, backgroundColor: o.selected },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' },
  units: { flexDirection: 'row', alignSelf: 'center', backgroundColor: o.soft, borderRadius: 20, padding: 3 },
  unit: { minWidth: 92, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  unitOn: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  unitTextOn: { color: o.text, fontWeight: '600' },
  soft: { backgroundColor: o.soft, borderRadius: 18, padding: 18, gap: 8 },
});
