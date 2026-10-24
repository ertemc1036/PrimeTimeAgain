import Feather from '@expo/vector-icons/Feather';
import { Tabs } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { darkColors, lightColors } from '@/theme';

type IconName = ComponentProps<typeof Feather>['name'];

const TABS: { name: 'control' | 'missions' | 'journey' | 'evolution' | 'profile'; icon: IconName; dark?: boolean }[] = [
  { name: 'control', icon: 'home', dark: true },
  { name: 'missions', icon: 'check-square' },
  { name: 'journey', icon: 'map' },
  { name: 'evolution', icon: 'trending-up' },
  { name: 'profile', icon: 'user' },
];

/** Five tabs. The tab bar follows the screen's theme: dark on Prime Control, light elsewhere. */
export default function TabLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 8);
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      {TABS.map((tab) => {
        const c = tab.dark ? darkColors : lightColors;
        return (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              title: t(`tabs.${tab.name}`),
              tabBarActiveTintColor: c.text,
              tabBarInactiveTintColor: c.textSecondary,
              tabBarStyle: { backgroundColor: c.background, borderTopColor: c.border, height: 62 + bottom, paddingTop: 6, paddingBottom: bottom },
              tabBarLabelStyle: { fontSize: 11, lineHeight: 15, fontWeight: '700', marginTop: 2 },
              sceneStyle: { backgroundColor: c.background },
              tabBarIcon: ({ color }) => <Feather name={tab.icon} color={color as string} size={21} />,
            }}
          />
        );
      })}
    </Tabs>
  );
}
