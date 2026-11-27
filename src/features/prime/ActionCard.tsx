import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Icon } from '@/components/ui';
import type { PrimeAction } from '@/domain/primeActions';
import type { ProposedActionState } from '@/domain/types';
import { colors, radii, spacing } from '@/theme';

import { describeAction } from './describe';

/**
 * One change Prime suggests. Pending: confirm, edit (meals) or dismiss. Applied: can be undone.
 * Estimated nutrition is always marked as an estimate.
 */
export function ActionCard({ action, onApply, onEdit, onDismiss, onUndo }: { action: PrimeAction & ProposedActionState; onApply(): void; onEdit?: () => void; onDismiss(): void; onUndo(): void }) {
  const { t } = useTranslation();
  const d = describeAction(action, t);
  const pending = action.status === 'pending';
  return (
    <View style={[styles.card, pending && styles.pending]} accessibilityLabel={d.title}>
      <View style={styles.head}>
        <View style={[styles.icon, action.status === 'applied' && styles.iconDone]}>
          <Icon name={action.status === 'applied' ? 'checkmark' : d.icon} size={18} color={colors.white} />
        </View>
        <View style={styles.flex}>
          <AppText variant="bodyStrong">{d.title}</AppText>
          {d.lines.map((l, i) => (
            <AppText key={i} variant="caption" color="secondary">
              {l}
            </AppText>
          ))}
          {d.estimate ? (
            <AppText variant="label" color={colors.text}>
              {t('prime.action.estimateNote')}
            </AppText>
          ) : null}
        </View>
      </View>
      {pending ? (
        <View style={styles.buttons}>
          <Button label={t('prime.action.apply')} size="sm" fullWidth={false} onPress={onApply} />
          {onEdit ? <Button label={t('prime.action.edit')} size="sm" variant="secondary" fullWidth={false} onPress={onEdit} /> : null}
          <Button label={t('prime.action.dismiss')} size="sm" variant="ghost" fullWidth={false} onPress={onDismiss} />
        </View>
      ) : (
        <View style={styles.buttons}>
          <AppText variant="label" color="secondary">
            {t(`prime.action.status.${action.status}` as 'prime.action.status.applied')}
          </AppText>
          {action.status === 'applied' ? <Button label={t('prime.action.undo')} size="sm" variant="ghost" fullWidth={false} onPress={onUndo} /> : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, padding: spacing.md, gap: spacing.sm },
  pending: { borderColor: colors.accent, borderWidth: 2 },
  head: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  icon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  iconDone: { backgroundColor: colors.accent },
  flex: { flex: 1, gap: 2 },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs },
});
