import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Icon, type IconName } from '@/components/ui';
import { HEALTH_CONSENT_VERSION } from '@/domain/consent';
import { openLegal } from '@/features/legal';
import { haptic, OText } from '@/features/onboarding/flow/ui';
import { onboarding as o } from '@/theme';

const POINTS: { key: 'what' | 'why' | 'where' | 'choice'; icon: IconName }[] = [
  { key: 'what', icon: 'heart-outline' },
  { key: 'why', icon: 'calculator-outline' },
  { key: 'where', icon: 'lock-closed-outline' },
  { key: 'choice', icon: 'hand-left-outline' },
];

/**
 * The explanation and the (never pre-ticked) checkbox of the health-data consent. Used in the
 * onboarding before the first health question and in Profile → Privacy. Texts: consent.* (pending
 * legal review).
 */
export function HealthConsentView({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.wrap}>
      {POINTS.map((p) => (
        <View key={p.key} style={styles.point}>
          <View style={styles.icon}>
            <Icon name={p.icon} size={18} color={o.text} />
          </View>
          <View style={styles.flex}>
            <OText variant="option">{t(`consent.${p.key}Title`)}</OText>
            <OText variant="caption">{t(`consent.${p.key}`)}</OText>
          </View>
        </View>
      ))}
      <Pressable
        onPress={() => {
          haptic();
          onToggle();
        }}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={t('consent.checkbox')}
        testID="consent-checkbox"
        style={[styles.box, checked && styles.boxOn]}>
        <View style={[styles.check, checked && styles.checkOn]}>{checked ? <Icon name="checkmark" size={16} color="#FFFFFF" /> : null}</View>
        <OText variant="body" style={styles.flex}>
          {t('consent.checkbox')}
        </OText>
      </Pressable>
      <OText variant="caption">
        {t('consent.version', { version: HEALTH_CONSENT_VERSION })} ·{' '}
        <OText variant="caption" style={styles.link} onPress={() => openLegal('privacy')} accessibilityRole="link">
          {t('profile.privacyPolicy')}
        </OText>
      </OText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  flex: { flex: 1 },
  point: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  icon: { width: 36, height: 36, borderRadius: 18, backgroundColor: o.soft, alignItems: 'center', justifyContent: 'center' },
  box: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1.5, borderColor: o.border, borderRadius: 16, padding: 16, marginTop: 4 },
  boxOn: { borderColor: o.selected, borderWidth: 2 },
  check: { width: 26, height: 26, borderRadius: 7, borderWidth: 1.5, borderColor: o.buttonDisabled, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  checkOn: { backgroundColor: o.text, borderColor: o.text },
  link: { textDecorationLine: 'underline', color: o.text },
});
