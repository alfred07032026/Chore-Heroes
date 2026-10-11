import { EXPORT_TABLES, LATEST_VERSION, resetDatabase } from '@/db/migrations';
import type { Db, DbExecutor } from '@/db/types';

const SECRET_SETTING_KEYS = new Set(['pinHash', 'pinSalt', 'pinFailures', 'pinLockedUntil']);

export interface ExportFile {
  app: 'chore-heroes';
  formatVersion: 1;
  schemaVersion: number;
  exportedAt: string;
  tables: Record<string, Record<string, unknown>[]>;
}

/** Everything on the device, as plain JSON. PIN material is never exported. */
export async function exportData(db: DbExecutor, now = new Date()): Promise<ExportFile> {
  const tables: ExportFile['tables'] = {};
  for (const t of EXPORT_TABLES) {
    const rows = await db.all<Record<string, unknown>>(`SELECT * FROM ${t}`);
    tables[t] =
      t === 'settings' ? rows.filter((r) => !SECRET_SETTING_KEYS.has(String(r.key))) : rows;
  }
  return {
    app: 'chore-heroes',
    formatVersion: 1,
    schemaVersion: LATEST_VERSION,
    exportedAt: now.toISOString(),
    tables,
  };
}

export function exportFileName(now = new Date()): string {
  const stamp = now.toISOString().slice(0, 19).replace(/[:T]/g, '-');
  return `chore-heroes-export-${stamp}.json`;
}

/** Erases all data and returns the app to first-run setup. */
export async function resetAllData(db: Db): Promise<void> {
  await resetDatabase(db);
}
