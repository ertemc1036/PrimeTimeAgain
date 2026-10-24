import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors, radii, spacing } from '@/theme';

import { AppText } from './AppText';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';

export function LoadingState({ label }: { label?: string }) {
  const { t } = useTranslation();
  return (
    <View style={styles.center} accessibilityLiveRegion="polite" accessibilityLabel={label ?? t('common.loading')}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

export function EmptyState({
  icon = 'sun',
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
  return (
    <View style={styles.box}>
      <View style={styles.badge}>
        <Icon name={icon} size={24} color={colors.primaryText} />
      </View>
      <AppText variant="subheading" align="center">
        {title}
      </AppText>
      {body ? (
        <AppText variant="caption" color={colors.textSecondary} align="center">
          {body}
        </AppText>
      ) : null}
      {action && onAction ? (
        <View style={styles.action}>
          <Button label={action} onPress={onAction} variant="secondary" fullWidth={false} />
        </View>
      ) : null}
    </View>
  );
}

export function ErrorState({ onRetry, title, body }: { onRetry?: () => void; title?: string; body?: string }) {
  const { t } = useTranslation();
  return (
    <View style={[styles.center, styles.pad]} accessibilityLiveRegion="assertive">
      <EmptyState
        icon="cloud-off"
        title={title ?? t('states.errorTitle')}
        body={body ?? t('states.errorBody')}
        action={onRetry ? t('common.retry') : undefined}
        onAction={onRetry}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  pad: { padding: spacing.xl },
  box: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xl, paddingHorizontal: spacing.md },
  badge: {
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  action: { marginTop: spacing.sm },
});
