import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View, type DimensionValue } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { colors, radii, spacing } from '@/theme';

import { AppText } from './AppText';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';

export function EmptyState({ icon, title, body, action, onAction }: { icon?: IconName; title: string; body?: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.empty}>
      {icon ? (
        <View style={styles.emptyIcon}>
          <Icon name={icon} size={24} />
        </View>
      ) : null}
      <AppText variant="subheading" align="center">
        {title}
      </AppText>
      {body ? (
        <AppText variant="caption" color="secondary" align="center">
          {body}
        </AppText>
      ) : null}
      {action && onAction ? (
        <View style={styles.action}>
          <Button label={action} onPress={onAction} size="md" fullWidth={false} />
        </View>
      ) : null}
    </View>
  );
}

export function Skeleton({ height = 20, width = '100%', radius = radii.sm }: { height?: number; width?: DimensionValue; radius?: number }) {
  const reduced = useReducedMotion();
  const o = useSharedValue(0.55);
  useEffect(() => {
    if (!reduced) o.set(withRepeat(withTiming(1, { duration: 800 }), -1, true));
  }, [o, reduced]);
  const style = useAnimatedStyle(() => ({ opacity: o.get() }));
  return <Animated.View style={[{ height, width, borderRadius: radius, backgroundColor: colors.card }, style]} />;
}

export function LoadingState({ label }: { label?: string }) {
  const { t } = useTranslation();
  return (
    <View style={styles.center} accessibilityLabel={label ?? t('common.loading')} accessibilityLiveRegion="polite">
      <ActivityIndicator color={colors.black} />
      {label ? (
        <AppText variant="caption" color="secondary">
          {label}
        </AppText>
      ) : null}
    </View>
  );
}

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={[styles.center, styles.pad]} accessibilityLiveRegion="assertive">
      <EmptyState icon="cloud-offline-outline" title={t('states.errorTitle')} body={t('states.errorBody')} action={onRetry ? t('common.retry') : undefined} onAction={onRetry} />
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xl, paddingHorizontal: spacing.md },
  emptyIcon: { width: 56, height: 56, borderRadius: radii.pill, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  action: { marginTop: spacing.sm },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.background },
  pad: { padding: spacing.xl },
});
