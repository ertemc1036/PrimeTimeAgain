import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { palette, radii } from '@/theme';

/**
 * Natural photo with a soft gradient for legible text on top.
 * If the photo can't load (offline), the calm brand gradient still looks intentional.
 */
export function PhotoHero({
  uri,
  height = 220,
  children,
  rounded = true,
  style,
}: {
  uri: string;
  height?: number;
  children?: ReactNode;
  rounded?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ height, borderRadius: rounded ? radii.xl : 0 }, styles.wrap, style]}>
      <LinearGradient
        colors={[palette.lightBlue, palette.sage, palette.peach]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Image
        source={{ uri }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={400}
        accessibilityIgnoresInvertColors
        accessible={false}
      />
      <LinearGradient
        colors={['rgba(34,48,42,0)', 'rgba(34,48,42,0.55)']}
        start={{ x: 0, y: 0.35 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', justifyContent: 'flex-end' },
  content: { padding: 20 },
});
