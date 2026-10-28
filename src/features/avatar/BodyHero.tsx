import { router, useFocusEffect } from 'expo-router';
import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { Icon, ProgressRing } from '@/components/ui';
import { HOLO } from '@/avatar/hologram';
import { weightProgress } from '@/domain/bodyStats';
import type { AppData } from '@/domain/types';
import { formatWeight } from '@/features/units';
import { formatDate } from '@/i18n/format';
import { useLocale } from '@/i18n/useLanguage';

// Three.js is loaded only when the card is shown, so app start stays fast.
const AvatarViewer = lazy(() => import('@/avatar/AvatarViewer').then((m) => ({ default: m.AvatarViewer })));

const C = {
  bg: HOLO.background,
  panel: '#13171A',
  line: '#232A2C',
  text: '#F2F5F3',
  muted: '#9AA39F',
  neon: HOLO.neon,
};

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value}${sub ? `, ${sub}` : ''}`}>
      <Text style={styles.statLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.statValue, accent && { color: C.neon }]} numberOfLines={1}>
        {value}
      </Text>
      {sub ? (
        <Text style={styles.statSub} numberOfLines={1}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

/** Dark 3D body scan at the top of Today, with the user's real weight and streak data. */
export function BodyHero({ data, streak }: { data: AppData; streak: number }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const reducedMotion = useReducedMotion();
  const [focused, setFocused] = useState(true);
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const [resetSignal, setResetSignal] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setForeground(s === 'active'));
    return () => sub.remove();
  }, []);

  const units = data.profile?.units ?? 'metric';
  const body = data.profile?.avatarBody ?? 'neutral';
  const w = weightProgress(data);
  const fmt = (kg: number) => formatWeight(kg, units);
  const change =
    w.changeKg === null ? '—' : w.changeKg === 0 ? fmt(0) : `${w.changeKg < 0 ? '−' : '+'}${fmt(Math.abs(w.changeKg))}`;

  const goalA11y =
    w.goalKg === null
      ? `${t('avatar.goal')}: ${t('avatar.noGoal')}`
      : `${t('avatar.goal')}: ${fmt(w.goalKg)}${w.progress === null ? '' : `, ${Math.round(w.progress * 100)}%`}`;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text style={styles.eyebrow}>{t('avatar.eyebrow')}</Text>
          <Text style={styles.title} accessibilityRole="header">
            {t('avatar.title')}
          </Text>
        </View>
        <Pressable
          onPress={() => setResetSignal((n) => n + 1)}
          accessibilityRole="button"
          accessibilityLabel={t('avatar.resetView')}
          hitSlop={8}
          style={styles.iconBtn}>
          <Icon name="scan-outline" size={20} color={C.text} />
        </Pressable>
        <Pressable onPress={() => router.push('/avatar-body')} accessibilityRole="button" accessibilityLabel={t('avatar.chooseBody')} hitSlop={8} style={styles.iconBtn}>
          <Icon name="body-outline" size={20} color={C.text} />
        </Pressable>
      </View>

      <View style={styles.stage}>
        <Suspense
          fallback={
            <View style={styles.center}>
              <ActivityIndicator color={C.neon} />
            </View>
          }>
          <AvatarViewer body={body} active={focused && foreground} reducedMotion={reducedMotion} resetSignal={resetSignal} />
        </Suspense>
        {/* Start and current weight float over the scan; touches pass through to the 3D view. */}
        <View style={styles.overlay} pointerEvents="none">
          <View style={styles.floatCard}>
            <Text style={styles.statLabel}>{t('avatar.start')}</Text>
            <Text style={styles.floatValue}>{w.startKg === null ? '—' : fmt(w.startKg)}</Text>
          </View>
          <View style={[styles.floatCard, styles.floatRight]}>
            <Text style={styles.statLabel}>{t('avatar.current')}</Text>
            <Text style={[styles.floatValue, { color: C.neon }]}>{w.currentKg === null ? '—' : fmt(w.currentKg)}</Text>
            {w.currentDate ? <Text style={styles.statSub}>{formatDate(w.currentDate, locale, { day: 'numeric', month: 'short' })}</Text> : null}
          </View>
        </View>
        <Text style={styles.hint} pointerEvents="none">
          {t('avatar.gestureHint')}
        </Text>
      </View>

      {w.currentKg === null ? (
        <Pressable onPress={() => router.push('/weight')} accessibilityRole="button" style={styles.addWeight}>
          <Icon name="add" size={18} color={C.bg} />
          <Text style={styles.addWeightText}>{t('avatar.addWeight')}</Text>
        </Pressable>
      ) : (
        <View style={styles.stats}>
          <View style={[styles.stat, styles.goal]} accessible accessibilityLabel={goalA11y}>
            {w.goalKg !== null && w.progress !== null ? (
              <ProgressRing progress={w.progress} size={52} stroke={5} color={C.neon} track={C.line}>
                <Text style={styles.ringText}>{Math.round(w.progress * 100)}%</Text>
              </ProgressRing>
            ) : null}
            <View style={styles.flex}>
              <Text style={styles.statLabel} numberOfLines={1}>
                {t('avatar.goal')}
              </Text>
              <Text style={styles.statValue} numberOfLines={1}>
                {w.goalKg === null ? '—' : fmt(w.goalKg)}
              </Text>
            </View>
            <Text style={[styles.statSub, styles.goalSub]} numberOfLines={2}>
              {w.goalKg === null ? t('avatar.noGoal') : w.remainingKg === 0 ? t('avatar.goalReached') : t('avatar.toGo', { value: fmt(w.remainingKg ?? 0) })}
            </Text>
          </View>
          <View style={styles.row}>
            <Stat label={t('avatar.change')} value={change} sub={t('avatar.sinceStart')} accent={w.changeKg !== null && w.changeKg !== 0} />
            <Stat label={t('avatar.streak')} value={t('avatar.days', { count: streak })} sub={streak > 0 ? t('avatar.inARow') : t('avatar.startToday')} />
          </View>
        </View>
      )}
      <Text style={styles.disclaimer}>{t('avatar.symbolic')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: C.bg, borderRadius: 28, overflow: 'hidden', paddingBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 4 },
  flex: { flex: 1 },
  eyebrow: { color: C.neon, fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 1.6 },
  title: { color: C.text, fontFamily: 'Inter_700Bold', fontSize: 20, lineHeight: 26, marginTop: 2 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.panel, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  stage: { height: 400 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  overlay: { ...StyleSheet.absoluteFill, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 14 },
  floatCard: { backgroundColor: 'rgba(19,23,26,0.82)', borderColor: C.line, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, minWidth: 96 },
  floatRight: { alignItems: 'flex-end' },
  floatValue: { color: C.text, fontFamily: 'Inter_700Bold', fontSize: 18, lineHeight: 23, fontVariant: ['tabular-nums'] },
  hint: { position: 'absolute', bottom: 8, left: 16, right: 16, textAlign: 'center', color: '#6F7874', fontFamily: 'Inter_500Medium', fontSize: 11, lineHeight: 15, letterSpacing: 0.2 },
  stats: { gap: 8, paddingHorizontal: 12, paddingTop: 4 },
  row: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, backgroundColor: C.panel, borderColor: C.line, borderWidth: 1, borderRadius: 16, padding: 10, gap: 2, minHeight: 78, justifyContent: 'center' },
  goal: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 72 },
  goalSub: { flexShrink: 1, textAlign: 'right', maxWidth: '45%', fontSize: 12 },
  statLabel: { color: C.muted, fontFamily: 'Inter_500Medium', fontSize: 11, letterSpacing: 0.3 },
  statValue: { color: C.text, fontFamily: 'Inter_700Bold', fontSize: 18, lineHeight: 23, fontVariant: ['tabular-nums'] },
  statSub: { color: C.muted, fontFamily: 'Inter_400Regular', fontSize: 11 },
  ringText: { color: C.text, fontFamily: 'Inter_700Bold', fontSize: 11 },
  addWeight: { marginHorizontal: 16, marginTop: 4, height: 48, borderRadius: 999, backgroundColor: C.neon, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  addWeightText: { color: C.bg, fontFamily: 'Inter_700Bold', fontSize: 15 },
  disclaimer: { color: '#7D8682', fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 15, paddingHorizontal: 18, paddingTop: 10 },
});
