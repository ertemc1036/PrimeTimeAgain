import Feather from '@expo/vector-icons/Feather';
import { Tabs } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { colors } from '@/theme';

type IconName = ComponentProps<typeof Feather>['name'];

const TABS: { name: string; icon: IconName; label: 'home' | 'today' | 'journey' | 'progress' | 'profile' }[] = [
  { name: 'home', icon: 'home', label: 'home' },
  { name: 'today', icon: 'check-circle', label: 'today' },
  { name: 'journey', icon: 'map', label: 'journey' },
  { name: 'progress', icon: 'bar-chart-2', label: 'progress' },
  { name: 'profile', icon: 'user', label: 'profile' },
];

export default function TabLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 8);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primaryText,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 58 + bottom,
          paddingTop: 6,
          paddingBottom: bottom,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
        sceneStyle: { backgroundColor: colors.background },
      }}>
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: t(`tabs.${tab.label}`),
            tabBarIcon: ({ color }) => <Feather name={tab.icon} color={color as string} size={22} />,
          }}
        />
      ))}
    </Tabs>
  );
}
