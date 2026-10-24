import * as Haptics from 'expo-haptics';
import { Platform, StyleSheet, View } from 'react-native';

import { radii, spacing, useColors } from '@/theme';

import { AppText } from './AppText';
import { Glyph, Icon } from './Icon';
import { PressableScale } from './PressableScale';

export interface SelectCardProps {
  title: string;
  description?: string;
  meta?: string;
  glyph?: string;
  selected: boolean;
  onPress: () => void;
  mode?: 'checkbox' | 'radio';
  /** 'row' = full-width list item; 'tile' = half-width grid tile. */
  layout?: 'row' | 'tile';
  disabled?: boolean;
  badge?: string;
}

/** Selectable option. Selected state = solid black (light) / white (dark) for a bold, clear choice. */
export function SelectCard({
  title,
  description,
  meta,
  glyph,
  selected,
  onPress,
  mode = 'checkbox',
  layout = 'row',
  disabled,
  badge,
}: SelectCardProps) {
  const colors = useColors();
  const fg = selected ? colors.onAccent : colors.text;
  const fg2 = selected ? colors.onAccent : colors.textSecondary;
  return (
    <PressableScale
      onPress={() => {
        if (Platform.OS !== 'web') void Haptics.selectionAsync();
        onPress();
      }}
      disabled={disabled}
      accessibilityRole={mode}
      accessibilityState={{ checked: selected, disabled: !!disabled }}
      accessibilityLabel={[title, description, meta, badge].filter(Boolean).join(', ')}
      style={[
        layout === 'tile' ? styles.tile : styles.row,
        { backgroundColor: selected ? colors.accent : colors.surface },
        disabled && !selected && styles.disabled,
      ]}>
      {glyph ? (
        <View style={[styles.glyph, { backgroundColor: selected ? 'rgba(127,127,127,0.25)' : colors.background }]}>
          <Glyph name={glyph} size={layout === 'tile' ? 20 : 19} color={fg} />
        </View>
      ) : null}
      <View style={layout === 'tile' ? styles.tileText : styles.text}>
        {badge ? (
          <AppText variant="overline" color={fg2}>
            {badge}
          </AppText>
        ) : null}
        <AppText variant="subheading" color={fg}>
          {title}
        </AppText>
        {description ? (
          <AppText variant="caption" color={fg2}>
            {description}
          </AppText>
        ) : null}
      </View>
      {meta && layout === 'row' ? (
        <AppText variant="label" color={fg2}>
          {meta}
        </AppText>
      ) : null}
      <View
        style={[
          mode === 'radio' ? styles.radio : styles.check,
          layout === 'tile' && styles.tileCheck,
          { borderColor: selected ? colors.onAccent : colors.border, backgroundColor: selected ? colors.onAccent : 'transparent' },
        ]}>
        {selected ? <Icon name="check" size={13} color={colors.accent} /> : null}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radii.md, minHeight: 64 },
  tile: { flexBasis: '47%', flexGrow: 1, padding: spacing.md, borderRadius: radii.md, minHeight: 118, gap: spacing.sm },
  glyph: { width: 40, height: 40, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  tileText: { gap: 2 },
  check: { width: 24, height: 24, borderRadius: 7, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  tileCheck: { position: 'absolute', top: spacing.sm, end: spacing.sm },
  disabled: { opacity: 0.4 },
});
