import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Card, Screen } from '@/components/ui';
import { usePrime } from '@/features/prime/usePrime';
import { formatDate } from '@/i18n/format';
import { useLocale } from '@/i18n/useLanguage';
import { useAppState } from '@/state/AppStateProvider';
import { spacing } from '@/theme';

/** Everything Prime saved after the user confirmed it, newest first, with undo. */
export default function PrimeLog() {
  const { t } = useTranslation();
  const locale = useLocale();
  const { data } = useAppState();
  const prime = usePrime();
  const items = [...data.primeActions].sort((a, b) => (a.appliedAt < b.appliedAt ? 1 : -1)).slice(0, 200);

  // The chat message that suggested an action, so its card shows "undone" too.
  const origin = (logId: string) => {
    for (const m of data.coach.messages) {
      const i = m.actions?.findIndex((a) => a.logId === logId) ?? -1;
      if (i >= 0) return { messageId: m.id, index: i };
    }
    return null;
  };

  return (
    <Screen back="back" title={t('prime.log.title')} subtitle={t('prime.log.subtitle')}>
      {items.length === 0 ? (
        <AppText variant="body" color="secondary">
          {t('prime.log.empty')}
        </AppText>
      ) : null}
      {items.map((a) => (
        <Card key={a.id} style={styles.item}>
          <View style={styles.flex}>
            <AppText variant="bodyStrong">{a.summary}</AppText>
            <AppText variant="caption" color="secondary">
              {formatDate(a.appliedAt.slice(0, 10), locale, { day: 'numeric', month: 'short' })} {new Date(a.appliedAt).toTimeString().slice(0, 5)}
              {a.undoneAt ? ` · ${t('prime.action.status.undone')}` : ''}
            </AppText>
          </View>
          {!a.undoneAt ? (
            <Button
              label={t('prime.action.undo')}
              size="sm"
              variant="ghost"
              fullWidth={false}
              onPress={() => {
                const o = origin(a.id);
                void prime.undo(a.id, o?.messageId, o?.index);
              }}
            />
          ) : null}
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1, gap: 2 },
});
