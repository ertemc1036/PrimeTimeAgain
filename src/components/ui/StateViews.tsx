import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { radii, spacing, useColors } from '@/theme';

import { AppText } from './AppText';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';

export function LoadingState({ label }: { label?: string }) {
  const { t } = useTranslation();
  const colors = useColors();
  return (
    <View style={[styles.center, { backgroundColor: colors.background }]} accessibilityLabel={label ?? t('common.loading')}>
      <ActivityIndicator color={colors.text} size="large" />
    </View>
  );
}

export function EmptyState({
  icon = 'circle',
  title,
  body,
  action,
  onAction,
}: {
  icon?: IconName;
  title: string;
  body?: string;
  action?: string;
  onAction?: () => void;
}) {
  const colors = useColors();
  return (
    <View style={styles.box}>
      <View style={[styles.badge, { borderColor: colors.border }]}>
        <Icon name={icon} size={22} />
      </View>
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
          <Button label={action} onPress={onAction} variant="secondary" size="md" fullWidth={false} />
        </View>
      ) : null}
    </View>
  );
}

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  const { t } = useTranslation();
  const colors = useColors();
  return (
    <View style={[styles.center, styles.pad, { backgroundColor: colors.background }]} accessibilityLiveRegion="assertive">
      <EmptyState
        icon="cloud-off"
        title={t('states.errorTitle')}
        body={t('states.errorBody')}
        action={onRetry ? t('common.retry') : undefined}
        onAction={onRetry}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pad: { padding: spacing.xl },
  box: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xl, paddingHorizontal: spacing.md },
  badge: {
    width: 52,
    height: 52,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  action: { marginTop: spacing.sm, alignSelf: 'center' },
});
