import { Platform, Share } from 'react-native';

import type { AppData } from '@/domain/types';

/** Share a JSON copy of all local data (photos are referenced by local path, not embedded). */
export const exportData = (data: AppData) => shareJson({ exportedAt: new Date().toISOString(), app: 'MINUS 30', source: 'device', data });

/** Share any JSON document (used for the device copy and for the cloud export). */
export async function shareJson(doc: unknown): Promise<boolean> {
  const json = JSON.stringify(doc, null, 2);
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
