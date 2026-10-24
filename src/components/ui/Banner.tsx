import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { colors, radii, spacing } from '@/theme';

import { AppText } from './AppText';
import { Icon } from './Icon';

/** Gentle inline notice for recoverable errors (e.g. a failed save). */
export function Banner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  const { t } = useTranslation();
  return (
    <Animated.View entering={FadeInUp} exiting={FadeOutUp} style={styles.banner} accessibilityLiveRegion="polite">
      <Icon name="alert-circle" size={18} color={colors.danger} />
      <View style={styles.text}>
        <AppText variant="caption" color={colors.text}>
          {message}
        </AppText>
      </View>
      <Pressable onPress={onDismiss} accessibilityRole="button" accessibilityLabel={t('common.close')} hitSlop={12}>
        <Icon name="x" size={18} color={colors.textSecondary} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.dangerSoft,
  },
  text: { flex: 1 },
});
