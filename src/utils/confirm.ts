import { Alert, Platform } from 'react-native';

/** Cross-platform confirmation dialog (React Native's Alert has no buttons on web). */
export function confirm(opts: { title: string; message: string; confirmLabel: string; cancelLabel: string; destructive?: boolean }): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(typeof window !== 'undefined' && window.confirm(`${opts.title}\n\n${opts.message}`));
  }
  return new Promise((resolve) =>
    Alert.alert(opts.title, opts.message, [
      { text: opts.cancelLabel, style: 'cancel', onPress: () => resolve(false) },
      { text: opts.confirmLabel, style: opts.destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ]),
  );
}

export function notify(title: string, message: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}
