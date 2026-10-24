import { Platform, type ViewStyle } from 'react-native';

const make = (y: number, blur: number, opacity: number, elevation: number): ViewStyle =>
  Platform.select<ViewStyle>({
    android: { elevation },
    default: {
      shadowColor: '#2E4A35',
      shadowOffset: { width: 0, height: y },
      shadowRadius: blur,
      shadowOpacity: opacity,
    },
  });

/** Soft, natural shadows; never harsh. */
export const shadows = {
  soft: make(2, 8, 0.06, 1),
  card: make(6, 18, 0.08, 3),
  raised: make(10, 28, 0.12, 6),
} as const;
