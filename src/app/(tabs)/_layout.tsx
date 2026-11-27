import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { PrimeAvatar } from '@/features/prime/PrimeAvatar';
import { colors, fonts, shadows } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** Today (dashboard) · Gym · Prime (highlighted, centre) · Kitchen · Profile. */
const TABS: { name: 'today' | 'gym' | 'prime' | 'kitchen' | 'me'; label: 'today' | 'gym' | 'prime' | 'kitchen' | 'profile'; icon: IconName; active: IconName }[] = [
  { name: 'today', label: 'today', icon: 'home-outline', active: 'home' },
  { name: 'gym', label: 'gym', icon: 'barbell-outline', active: 'barbell' },
  { name: 'prime', label: 'prime', icon: 'sparkles-outline', active: 'sparkles' },
  { name: 'kitchen', label: 'kitchen', icon: 'restaurant-outline', active: 'restaurant' },
  { name: 'me', label: 'profile', icon: 'person-circle-outline', active: 'person-circle' },
];

export default function TabLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 8);
  const barHeight = 62 + bottom;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.black,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, height: barHeight, paddingTop: 8, paddingBottom: bottom },
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 15, marginTop: 2 },
        sceneStyle: { backgroundColor: colors.background },
      }}>
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: t(`tabs.${tab.label}`),
            tabBarIcon: ({ color, focused }) =>
              tab.name === 'prime' ? (
                <View style={styles.prime}>
                  <PrimeAvatar size={58} ring={focused ? colors.primary : colors.white} active={focused} />
                </View>
              ) : (
                <Ionicons name={focused ? tab.active : tab.icon} color={color as string} size={23} />
              ),
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  prime: { marginTop: -26, borderRadius: 29, ...shadows.float },
});
