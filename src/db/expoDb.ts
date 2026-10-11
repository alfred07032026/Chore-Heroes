import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';

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

export async function openExpoDb(name = DB_NAME): Promise<Db> {
  const conn = await SQLite.openDatabaseAsync(name);
  if (Platform.OS !== 'web') await conn.execAsync('PRAGMA journal_mode = WAL');
  await conn.execAsync('PRAGMA foreign_keys = ON');
  const base = executor(conn);
  const lock = createMutex();

  return {
    ...base,
    transaction<T>(fn: (tx: DbExecutor) => Promise<T>): Promise<T> {
      return lock(async () => {
        let result: T | undefined;
        if (Platform.OS === 'web') {
          // Exclusive transactions are not available on web; the mutex still serializes writers.
          await conn.withTransactionAsync(async () => {
            result = await fn(base);
          });
        } else {
          await conn.withExclusiveTransactionAsync(async (txn) => {
            result = await fn(executor(txn));
          });
        }
        return result as T;
      });
    },
  };
}
