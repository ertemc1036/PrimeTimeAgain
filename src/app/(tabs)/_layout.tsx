import Ionicons from '@expo/vector-icons/Ionicons';
import { usePathname } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { CoachFab } from '@/features/CoachFab';
import { colors, fonts } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

const TABS: { name: 'today' | 'plan' | 'food' | 'workout' | 'journey'; icon: IconName; active: IconName }[] = [
  { name: 'today', icon: 'home-outline', active: 'home' },
  { name: 'plan', icon: 'calendar-outline', active: 'calendar' },
  { name: 'food', icon: 'restaurant-outline', active: 'restaurant' },
  { name: 'workout', icon: 'barbell-outline', active: 'barbell' },
  { name: 'journey', icon: 'stats-chart-outline', active: 'stats-chart' },
];

export default function TabLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 8);
  const barHeight = 60 + bottom;
  // Plan has its own sticky save button and a "Plan With AI" entry, so the floating coach button is hidden there.
  const showCoach = !usePathname().startsWith('/plan');
  return (
    <View style={styles.root}>
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
              title: t(`tabs.${tab.name}`),
              tabBarIcon: ({ color, focused }) => <Ionicons name={focused ? tab.active : tab.icon} color={color as string} size={23} />,
            }}
          />
        ))}
      </Tabs>
      {showCoach ? (
        <View pointerEvents="box-none" style={[styles.fab, { bottom: barHeight }]}>
          <CoachFab />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fab: { position: 'absolute', left: 0, right: 0, height: 88 },
});
