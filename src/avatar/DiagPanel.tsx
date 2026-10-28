import { useCallback, useSyncExternalStore } from 'react';
import { Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { DiagLog } from './diagnostics';

const COLOR = { ok: '#7DFFAF', fail: '#FF6B6B', info: '#9AA39F' } as const;
const MONO = { fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }), fontSize: 11, lineHeight: 15 } as const;

/** The 3D pipeline log, newest at the bottom. "Share" sends it as plain text (e.g. to yourself). */
export function DiagPanel({ log, compact = false }: { log: DiagLog; compact?: boolean }) {
  const { t } = useTranslation();
  const subscribe = useCallback((fn: () => void) => log.subscribe(fn), [log]);
  const count = useSyncExternalStore(subscribe, () => log.entries.length);
  const entries = compact ? log.entries.filter((e) => e.status === 'fail').slice(-2) : log.entries;
  return (
    <View style={styles.panel} accessibilityLabel={t('avatar.diagnostics')}>
      {entries.map((e, i) => (
        <View key={`${i}-${count}`} style={styles.row}>
          <Text style={[MONO, styles.status, { color: COLOR[e.status] }]}>{e.status === 'ok' ? '✓' : e.status === 'fail' ? '✗' : '·'}</Text>
          <View style={styles.flex}>
            <Text style={[MONO, styles.step]}>
              {e.step} <Text style={styles.at}>{e.at} ms</Text>
            </Text>
            {e.detail ? (
              <Text style={[MONO, { color: e.status === 'fail' ? COLOR.fail : COLOR.info }]} selectable>
                {e.detail}
              </Text>
            ) : null}
          </View>
        </View>
      ))}
      <Pressable accessibilityRole="button" onPress={() => void Share.share({ message: `Diet9 3D diagnostics\n${log.text()}` })} style={styles.share}>
        <Text style={styles.shareText}>{t('avatar.shareDiagnostics')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: '#0E1113', borderColor: '#232A2C', borderWidth: 1, borderRadius: 12, padding: 10, gap: 6, alignSelf: 'stretch' },
  row: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
  status: { width: 12 },
  step: { color: '#F2F5F3' },
  at: { color: '#6F7874' },
  share: { alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: '#3A4446', marginTop: 4 },
  shareText: { color: '#C9D1CD', fontFamily: 'Inter_600SemiBold', fontSize: 12 },
});
