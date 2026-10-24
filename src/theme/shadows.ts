import { Platform, type ViewStyle } from 'react-native';

const make = (y: number, blur: number, opacity: number, elevation: number): ViewStyle =>
  Platform.select<ViewStyle>({
    android: { elevation },
    default: { shadowColor: '#000000', shadowOffset: { width: 0, height: y }, shadowRadius: blur, shadowOpacity: opacity },
  });

export const shadows = {
  soft: make(1, 4, 0.06, 1),
  card: make(4, 14, 0.08, 3),
  raised: make(10, 30, 0.18, 8),
} as const;
