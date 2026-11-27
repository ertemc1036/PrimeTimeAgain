import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { FlatList, Platform, Pressable, ScrollView, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewInstance } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { Icon, type IconName } from '@/components/ui';
import { onboarding as o } from '@/theme';

import { haptic, OText } from './ui';

const tick = () => {
  if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};

const ITEM_H = 44;
const VISIBLE = 5;

/**
 * iOS-style wheel: the selected value sits on a light grey band in the middle, neighbours fade out.
 * VoiceOver/TalkBack: adjustable (swipe up/down) as the accessible alternative to scrolling.
 */
export function WheelPicker({ items, index, onChange, accessibilityLabel, width }: { items: string[]; index: number; onChange: (i: number) => void; accessibilityLabel: string; width?: number }) {
  const ref = useRef<ScrollViewInstance>(null);
  const [current, setCurrent] = useState(index);
  const currentRef = useRef(index);

  useEffect(() => {
    if (index !== currentRef.current) {
      currentRef.current = index;
      setCurrent(index);
      ref.current?.scrollTo({ y: index * ITEM_H, animated: false });
    }
  }, [index]);

  const select = (i: number, scroll = false) => {
    const c = Math.max(0, Math.min(items.length - 1, i));
    if (c === currentRef.current) return;
    currentRef.current = c;
    setCurrent(c);
    tick();
    onChange(c);
    if (scroll) ref.current?.scrollTo({ y: c * ITEM_H, animated: true });
  };
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => select(Math.round(e.nativeEvent.contentOffset.y / ITEM_H));

  return (
    <View
      style={[s.wheel, width ? { width } : s.flex]}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ text: items[current] }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => select(current + (e.nativeEvent.actionName === 'increment' ? 1 : -1), true)}>
      <View style={s.band} pointerEvents="none" />
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={onScroll}
        contentOffset={{ x: 0, y: index * ITEM_H }}
        onLayout={() => ref.current?.scrollTo({ y: currentRef.current * ITEM_H, animated: false })}
        contentContainerStyle={{ paddingVertical: ((VISIBLE - 1) / 2) * ITEM_H }}>
        {items.map((label, i) => {
          const d = Math.abs(i - current);
          return (
            <Pressable key={`${label}-${i}`} onPress={() => select(i, true)} style={s.item} aria-hidden>
              <OText variant="option" style={[s.itemText, d === 0 ? s.itemOn : { opacity: d === 1 ? 0.45 : 0.2 }]} numberOfLines={1}>
                {label}
              </OText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const TICK_W = 10;

/**
 * Horizontal weight scale: fine ticks, longer marks at whole and every fifth unit, a fixed black
 * indicator in the middle; the scale moves underneath. Values snap to `step` (0.1 kg / 0.2 lb).
 */
export function WeightRuler({
  value,
  min,
  max,
  step,
  onChange,
  accessibilityLabel,
  format,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  accessibilityLabel: string;
  format: (v: number) => string;
}) {
  const ref = useRef<FlatList<number>>(null);
  const [width, setWidth] = useState(0);
  const last = useRef(value);
  const perUnit = Math.round(1 / step);
  const units = Array.from({ length: Math.floor(max - min) + 1 }, (_, i) => min + i);
  const offsetFor = (v: number) => Math.round((v - min) / step) * TICK_W;

  useEffect(() => {
    if (!width) return;
    if (Math.abs(value - last.current) > step / 2 || last.current === value) {
      last.current = value;
      requestAnimationFrame(() => ref.current?.scrollToOffset({ offset: offsetFor(value), animated: false }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-centre on unit changes and after layout only
  }, [width, min, step]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const raw = min + Math.round(e.nativeEvent.contentOffset.x / TICK_W) * step;
    const v = Math.round(Math.max(min, Math.min(max, raw)) * 10) / 10;
    if (v === last.current) return;
    if (Math.floor(v) !== Math.floor(last.current)) tick();
    last.current = v;
    onChange(v);
  };
  const nudge = (dir: 1 | -1) => {
    const v = Math.round(Math.max(min, Math.min(max, last.current + dir * step)) * 10) / 10;
    last.current = v;
    onChange(v);
    ref.current?.scrollToOffset({ offset: offsetFor(v), animated: true });
  };

  return (
    <View
      style={s.ruler}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ text: format(value) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => nudge(e.nativeEvent.actionName === 'increment' ? 1 : -1)}>
      {width ? (
        <FlatList
          ref={ref}
          horizontal
          data={units}
          keyExtractor={(u) => String(u)}
          showsHorizontalScrollIndicator={false}
          snapToInterval={TICK_W}
          decelerationRate="fast"
          scrollEventThrottle={16}
          onScroll={onScroll}
          initialNumToRender={Math.ceil(width / (perUnit * TICK_W)) + 4}
          windowSize={7}
          getItemLayout={(_, i) => ({ length: perUnit * TICK_W, offset: width / 2 + i * perUnit * TICK_W, index: i })}
          ListHeaderComponent={<View style={{ width: width / 2 }} />}
          ListFooterComponent={<View style={{ width: width / 2 - TICK_W }} />}
          renderItem={({ item: u }) => (
            <View style={[s.unitRow, { width: perUnit * TICK_W }]}>
              {Array.from({ length: perUnit }, (_, k) => (
                <View key={k} style={s.tickCell}>
                  <View style={[s.tick, k === 0 ? (u % 5 === 0 ? s.tickMajor : s.tickWhole) : null]} />
                </View>
              ))}
            </View>
          )}
        />
      ) : null}
      <View style={[s.indicator, { left: width / 2 - 1.5 }]} pointerEvents="none" />
    </View>
  );
}

export interface PaceStop {
  icon: IconName;
  label: string;
}

/** Three neutral stops on a track; the thumb glides to the chosen stop. */
export function PaceSlider({ stops, index, onChange }: { stops: PaceStop[]; index: number; onChange: (i: number) => void }) {
  const reduced = useReducedMotion();
  const [w, setW] = useState(0);
  const x = useSharedValue(0);
  useEffect(() => {
    const target = (w - 28) * (index / (stops.length - 1));
    x.set(reduced || !w ? target : withTiming(target, { duration: 220 }));
  }, [index, w, reduced, stops.length, x]);
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));
  const fill = useAnimatedStyle(() => ({ width: x.get() + 14 }));

  return (
    <View style={s.pace} accessibilityRole="radiogroup">
      <View style={s.paceIcons}>
        {stops.map((st, i) => (
          <Pressable
            key={st.label}
            onPress={() => {
              haptic();
              onChange(i);
            }}
            accessibilityRole="radio"
            accessibilityState={{ checked: i === index }}
            accessibilityLabel={st.label}
            style={s.paceStop}>
            <Icon name={st.icon} size={26} color={i === index ? o.text : o.secondary} />
            <OText variant="caption" style={[s.paceLabel, i === index && s.paceLabelOn]}>
              {st.label}
            </OText>
          </Pressable>
        ))}
      </View>
      <View style={s.paceTrack} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        <View style={s.paceBase} />
        <Animated.View style={[s.paceFill, fill]} />
        <Animated.View style={[s.paceThumb, thumb]} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  wheel: { height: ITEM_H * VISIBLE, justifyContent: 'center' },
  band: { position: 'absolute', left: 0, right: 0, top: ((VISIBLE - 1) / 2) * ITEM_H, height: ITEM_H, borderRadius: 12, backgroundColor: o.soft },
  item: { height: ITEM_H, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  itemText: { fontSize: 18 },
  itemOn: { fontSize: 20, fontWeight: '600' },
  ruler: { height: 72, justifyContent: 'center' },
  unitRow: { flexDirection: 'row', height: 56, alignItems: 'flex-start' },
  tickCell: { width: TICK_W, alignItems: 'flex-start' },
  tick: { width: 1, height: 22, backgroundColor: '#B5B5B7' },
  tickWhole: { height: 34, width: 1.5, backgroundColor: '#8E8E93' },
  tickMajor: { height: 46, width: 2, backgroundColor: '#3A3A3C' },
  indicator: { position: 'absolute', top: 2, width: 3, height: 62, borderRadius: 1.5, backgroundColor: o.text },
  pace: { gap: 18, alignSelf: 'stretch' },
  paceIcons: { flexDirection: 'row', justifyContent: 'space-between' },
  paceStop: { alignItems: 'center', gap: 6, minWidth: 84, minHeight: 56 },
  paceLabel: { textAlign: 'center' },
  paceLabelOn: { color: o.text, fontWeight: '600' },
  paceTrack: { height: 28, justifyContent: 'center' },
  paceBase: { position: 'absolute', left: 0, right: 0, height: 4, borderRadius: 2, backgroundColor: o.border },
  paceFill: { position: 'absolute', left: 0, height: 4, borderRadius: 2, backgroundColor: o.text },
  paceThumb: {
    position: 'absolute',
    left: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: o.border,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
});
