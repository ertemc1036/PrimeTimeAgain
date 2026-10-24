import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { radii, spacing, status, useColors } from '@/theme';

import { AppText } from './AppText';
import { Icon } from './Icon';

/** Inline notice for recoverable errors or important info. */
export function Banner({ message, onDismiss, tone = 'error' }: { message: string; onDismiss?: () => void; tone?: 'error' | 'info' }) {
  const { t } = useTranslation();
  const colors = useColors();
  return (
    <Animated.View
      entering={FadeInUp}
      exiting={FadeOutUp}
      style={[styles.banner, { backgroundColor: colors.surface, borderColor: tone === 'error' ? status.danger : colors.border }]}
      accessibilityLiveRegion="polite">
      <Icon name={tone === 'error' ? 'alert-circle' : 'info'} size={18} color={tone === 'error' ? status.danger : colors.text} />
      <View style={styles.text}>
        <AppText variant="caption">{message}</AppText>
      </View>
      {onDismiss ? (
        <Pressable onPress={onDismiss} accessibilityRole="button" accessibilityLabel={t('common.close')} hitSlop={12}>
          <Icon name="x" size={18} color={colors.textSecondary} />
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radii.sm, borderWidth: 1 },
  text: { flex: 1 },
});
