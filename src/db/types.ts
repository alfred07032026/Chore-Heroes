export type SqlValue = string | number | null;
export type SqlParams = readonly SqlValue[];

export interface RunResult {
  changes: number;
}

/** Minimal async SQL surface shared by the app (expo-sqlite) and tests (node:sqlite). */
export interface DbExecutor {
  run(sql: string, params?: SqlParams): Promise<RunResult>;
  all<T>(sql: string, params?: SqlParams): Promise<T[]>;
  get<T>(sql: string, params?: SqlParams): Promise<T | null>;
  exec(sql: string): Promise<void>;
}

export interface Db extends DbExecutor {
  /**
   * Runs `fn` atomically. Transactions are serialized, so read-check-write sequences
   * (e.g. "is the balance enough? then debit") cannot interleave.
   */
  transaction<T>(fn: (tx: DbExecutor) => Promise<T>): Promise<T>;
}

/** Serializes async work: each call waits for the previous one to settle. */
export function createMutex() {
  let tail: Promise<unknown> = Promise.resolve();
  return function lock<T>(work: () => Promise<T>): Promise<T> {
    const result = tail.then(work, work);
    tail = result.catch(() => undefined);
    return result;
  };
}
