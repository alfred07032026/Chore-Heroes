import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

import { createMutex, type Db, type DbExecutor, type SqlParams } from './types';

type Native = Pick<
  SQLite.SQLiteDatabase,
  'runAsync' | 'getAllAsync' | 'getFirstAsync' | 'execAsync'
>;

function executor(conn: Native): DbExecutor {
  return {
    async run(sql, params: SqlParams = []) {
      const r = await conn.runAsync(sql, params as SQLite.SQLiteBindValue[]);
      return { changes: r.changes };
    },
    all<T>(sql: string, params: SqlParams = []) {
      return conn.getAllAsync<T>(sql, params as SQLite.SQLiteBindValue[]);
    },
    get<T>(sql: string, params: SqlParams = []) {
      return conn.getFirstAsync<T>(sql, params as SQLite.SQLiteBindValue[]);
    },
    exec(sql) {
      return conn.execAsync(sql);
    },
  };
}

export const DB_NAME = 'chore-heroes.db';

/**
 * Single-connection database with serialized writes.
 *
 * Every write — standalone `run`/`exec` or a whole `transaction` — goes through one JS mutex
 * on one connection, so writers can never collide (no SQLITE_BUSY between our own
 * connections) and a standalone write can never land inside someone else's open transaction.
 * Reads are not queued; on the same connection they simply see the latest state.
 */
export async function openExpoDb(name = DB_NAME): Promise<Db> {
  const conn = await SQLite.openDatabaseAsync(name);
  if (Platform.OS !== 'web') await conn.execAsync('PRAGMA journal_mode = WAL');
  await conn.execAsync('PRAGMA foreign_keys = ON');
  await conn.execAsync('PRAGMA busy_timeout = 5000');
  const raw = executor(conn);
  const lock = createMutex();

  return {
    all: raw.all,
    get: raw.get,
    run: (sql, params) => lock(() => raw.run(sql, params)),
    exec: (sql) => lock(() => raw.exec(sql)),
    transaction<T>(fn: (tx: DbExecutor) => Promise<T>): Promise<T> {
      return lock(async () => {
        await conn.execAsync('BEGIN IMMEDIATE');
        try {
          const result = await fn(raw);
          await conn.execAsync('COMMIT');
          return result;
        } catch (e) {
          await conn.execAsync('ROLLBACK').catch(() => undefined);
          throw e;
        }
      });
    },
  };
}
