import { Platform, Share } from 'react-native';

import type { AppData } from '@/domain/types';

/** Share a JSON copy of all local data (photos are referenced by local path, not embedded). */
export async function exportData(data: AppData): Promise<boolean> {
  const json = JSON.stringify({ exportedAt: new Date().toISOString(), app: 'MINUS 30', data }, null, 2);
  try {
    if (Platform.OS === 'web') {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `minus30-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      return true;
    }
    await Share.share({ message: json, title: 'MINUS 30 data export' });
    return true;
  } catch {
    return false;
  }
}
