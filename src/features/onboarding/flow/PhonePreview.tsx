import { useEffect, useState } from 'react';
import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeOut, useReducedMotion } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { onboarding as o } from '@/theme';

import { OText } from './ui';

/** Real PrimeMe AI screens with sample data (Today, Prime chat, Kitchen, Gym). */
const SCREENS = [
  { key: 'today', source: require('../../../../assets/images/onboarding/preview-today.webp') },
  { key: 'prime', source: require('../../../../assets/images/onboarding/preview-prime.webp') },
  { key: 'kitchen', source: require('../../../../assets/images/onboarding/preview-kitchen.webp') },
  { key: 'gym', source: require('../../../../assets/images/onboarding/preview-gym.webp') },
] as const;

/** Phone mockup on the welcome screen; cycles gently through the app's main areas. */
export function PhonePreview() {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const { height } = useWindowDimensions();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => setI((n) => (n + 1) % SCREENS.length), 3200);
    return () => clearInterval(id);
  }, [reduced]);
  // Scales with the screen so the headline and buttons always fit without scrolling.
  const h = Math.max(260, Math.min(470, height * 0.5));
  const w = h * 0.49;
  const screen = SCREENS[i];
  return (
    <View style={styles.wrap} accessible accessibilityRole="image" accessibilityLabel={`${t('ob.welcome.previewA11y')}: ${t(`ob.welcome.area.${screen.key}`)}`}>
      <View style={[styles.phone, { width: w, height: h, borderRadius: w * 0.16 }]}>
        <View style={[styles.screen, { borderRadius: w * 0.13 }]}>
          <Animated.View key={screen.key} entering={reduced ? undefined : FadeIn.duration(500)} exiting={reduced ? undefined : FadeOut.duration(300)} style={StyleSheet.absoluteFill}>
            <Image source={screen.source} style={styles.image} resizeMode="cover" />
          </Animated.View>
        </View>
        <View style={[styles.island, { width: w * 0.3, top: h * 0.025 }]} />
      </View>
      <OText variant="caption" style={styles.caption}>
        {t(`ob.welcome.area.${screen.key}`)} · {t('ob.welcome.sample')}
      </OText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 10 },
  phone: { backgroundColor: '#111111', padding: 6, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 8 },
  screen: { flex: 1, overflow: 'hidden', backgroundColor: o.soft },
  image: { width: '100%', height: '100%' },
  island: { position: 'absolute', alignSelf: 'center', height: 14, borderRadius: 7, backgroundColor: '#111111' },
  caption: { textAlign: 'center' },
});
