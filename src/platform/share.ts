import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

/** Writes JSON to a cache file and opens the system share sheet (AirDrop, Files, Mail…). */
export async function shareJsonFile(
  fileName: string,
  data: unknown,
): Promise<'shared' | 'downloaded' | 'unavailable'> {
  const json = JSON.stringify(data, null, 2);
  if (Platform.OS === 'web') {
    const g = globalThis as unknown as {
      document?: { createElement(t: string): { href: string; download: string; click(): void } };
      URL?: { createObjectURL(b: unknown): string; revokeObjectURL(u: string): void };
      Blob?: new (parts: string[], opts: { type: string }) => unknown;
    };
    if (!g.document || !g.URL || !g.Blob) return 'unavailable';
    const url = g.URL.createObjectURL(new g.Blob([json], { type: 'application/json' }));
    const a = g.document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    g.URL.revokeObjectURL(url);
    return 'downloaded';
  }
  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create();
  file.write(json);
  if (!(await Sharing.isAvailableAsync())) return 'unavailable';
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    dialogTitle: 'Export Chore Heroes data',
    UTI: 'public.json',
  });
  return 'shared';
}
