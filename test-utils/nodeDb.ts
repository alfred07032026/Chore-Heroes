import { DatabaseSync } from 'node:sqlite';

import { createMutex, type Db, type DbExecutor, type SqlParams } from '../src/db/types';
import { migrate } from '../src/db/migrations';

/** In-memory SQLite (Node's built-in driver) implementing the app's Db interface. */
export function createNodeDb(): Db {
  const conn = new DatabaseSync(':memory:');
  conn.exec('PRAGMA foreign_keys = ON');
  const exec: DbExecutor = {
    async run(sql, params: SqlParams = []) {
      const r = conn.prepare(sql).run(...(params as (string | number | null)[]));
      return { changes: Number(r.changes) };
    },
    async all<T>(sql: string, params: SqlParams = []) {
      return conn.prepare(sql).all(...(params as (string | number | null)[])) as T[];
    },
    async get<T>(sql: string, params: SqlParams = []) {
      const row = conn.prepare(sql).get(...(params as (string | number | null)[]));
      return (row ?? null) as T | null;
    },
    async exec(sql) {
      conn.exec(sql);
    },
  };
  const lock = createMutex();
  return {
    ...exec,
    transaction<T>(fn: (tx: DbExecutor) => Promise<T>) {
      return lock(async () => {
        conn.exec('BEGIN IMMEDIATE');
        try {
          const result = await fn(exec);
          conn.exec('COMMIT');
          return result;
        } catch (e) {
          conn.exec('ROLLBACK');
          throw e;
        }
      });
    },
  };
}

export async function createMigratedDb(): Promise<Db> {
  const db = createNodeDb();
  await migrate(db);
  return db;
}
