import { Image } from 'expo-image';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AvatarViewer } from '@/avatar/AvatarViewer';
import { AVATAR_PRESETS } from '@/avatar/presets';
import type { AvatarConfig, AvatarLighting, AvatarPose } from '@/avatar/types';
import { AppText, Chip, PressableScale } from '@/components/ui';
import { darkColors, radii, spacing, ThemeProvider, useColors } from '@/theme';

const POSES: AvatarPose[] = ['breathe', 'look'];
const LIGHTINGS: AvatarLighting[] = ['studio', 'dusk', 'cool'];

/** Live 3D preview plus the customisation that is genuinely available today. */
export function AvatarCustomizer({
  config,
  onChange,
  active,
  stageHeight = 420,
  showLighting = true,
}: {
  config: AvatarConfig;
  onChange: (c: AvatarConfig) => void;
  active: boolean;
  stageHeight?: number;
  showLighting?: boolean;
}) {
  const { t } = useTranslation();
  const colors = useColors();
  return (
    <View style={styles.wrap}>
      <ThemeProvider mode="dark">
        <View style={[styles.stage, { height: stageHeight }]}>
          <AvatarViewer config={config} active={active} background={darkColors.background} />
        </View>
      </ThemeProvider>

      <AppText variant="overline" color="secondary">
        {t('studio.presets')}
      </AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presets} accessibilityRole="radiogroup">
        {AVATAR_PRESETS.map((p, i) => {
          const selected = p.id === config.presetId;
          return (
            <PressableScale
              key={p.id}
              onPress={() => onChange({ ...config, presetId: p.id })}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={t('studio.presetA11y', { number: i + 1 })}
              style={[styles.preset, { borderColor: selected ? colors.text : 'transparent' }]}>
              <Image source={p.preview} style={styles.presetImage} contentFit="cover" accessible={false} />
            </PressableScale>
          );
        })}
      </ScrollView>

      <AppText variant="overline" color="secondary">
        {t('studio.pose')}
      </AppText>
      <View style={styles.chips} accessibilityRole="radiogroup">
        {POSES.map((p) => (
          <Chip key={p} mode="radio" label={t(`studio.poses.${p}`)} selected={config.pose === p} onPress={() => onChange({ ...config, pose: p })} />
        ))}
      </View>

      {showLighting ? (
        <>
          <AppText variant="overline" color="secondary">
            {t('studio.lighting')}
          </AppText>
          <View style={styles.chips} accessibilityRole="radiogroup">
            {LIGHTINGS.map((l) => (
              <Chip key={l} mode="radio" label={t(`studio.lightings.${l}`)} selected={config.lighting === l} onPress={() => onChange({ ...config, lighting: l })} />
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  stage: { borderRadius: radii.lg, overflow: 'hidden', backgroundColor: darkColors.background },
  presets: { gap: spacing.xs, paddingVertical: 2 },
  preset: { width: 64, height: 88, borderRadius: radii.sm, borderWidth: 2, overflow: 'hidden', backgroundColor: '#08090B' },
  presetImage: { width: '100%', height: '100%' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
