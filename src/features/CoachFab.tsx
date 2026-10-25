import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Icon, PressableScale } from '@/components/ui';
import { usePro } from '@/state/ProProvider';
import { colors, radii, shadows, spacing } from '@/theme';

/** Floating AI Coach button. Free users see the Pro paywall instead. */
export function CoachFab() {
  const { t } = useTranslation();
  const { canOpenPro } = usePro();
  return (
    <View pointerEvents="box-none" style={styles.host}>
      <PressableScale
        onPress={() => router.push(canOpenPro ? '/coach' : '/pro')}
        accessibilityRole="button"
        accessibilityLabel={t('coach.open')}
        style={[styles.fab, shadows.float]}>
        <Icon name="sparkles-outline" size={24} color={colors.white} />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', right: spacing.lg, bottom: spacing.md },
  fab: { width: 56, height: 56, borderRadius: radii.pill, backgroundColor: colors.black, alignItems: 'center', justifyContent: 'center' },
});
