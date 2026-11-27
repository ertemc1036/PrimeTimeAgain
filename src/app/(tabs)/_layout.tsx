import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { PrimeMascot } from '@/features/prime/PrimeMascot';
import { colors, fonts } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** Five areas; Prime, the AI agent, sits highlighted in the middle. */
const TABS: { name: 'today' | 'plan' | 'prime' | 'journey' | 'me'; label: string; icon: IconName; active: IconName }[] = [
  { name: 'today', label: 'today', icon: 'home-outline', active: 'home' },
  { name: 'plan', label: 'plan', icon: 'calendar-outline', active: 'calendar' },
  { name: 'prime', label: 'prime', icon: 'sparkles-outline', active: 'sparkles' },
  { name: 'journey', label: 'journey', icon: 'stats-chart-outline', active: 'stats-chart' },
  { name: 'me', label: 'profile', icon: 'person-circle-outline', active: 'person-circle' },
];

export default function TabLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 8);
  const barHeight = 60 + bottom;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.black,
        tabBarInactiveTintColor: '#8A8A8A',
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.border, height: barHeight, paddingTop: 6, paddingBottom: bottom },
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 15, marginTop: 2 },
        sceneStyle: { backgroundColor: colors.background },
      }}>
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: t(`tabs.${tab.label}` as 'tabs.today'),
            tabBarIcon: ({ color, focused }) =>
              tab.name === 'prime' ? (
                <View style={[styles.prime, focused && styles.primeActive]}>
                  <PrimeMascot size={44} onDark />
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
  prime: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginTop: -26,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.white,
  },
  primeActive: { borderColor: colors.primary },
});
