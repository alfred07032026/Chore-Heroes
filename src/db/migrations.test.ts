import { createMigratedDb, createNodeDb } from '../../test-utils/nodeDb';
import {
  currentVersion,
  LATEST_VERSION,
  migrate,
  MIGRATIONS,
  resetDatabase,
  type Migration,
} from './migrations';

describe('migrations', () => {
  it('migrates an empty database to the latest version and is idempotent', async () => {
    const db = createNodeDb();
    expect(await migrate(db)).toEqual(MIGRATIONS.map((m) => m.version));
    expect(await currentVersion(db)).toBe(LATEST_VERSION);
    expect(await migrate(db)).toEqual([]);
  });

  it('preserves existing data when a new migration is added', async () => {
    const db = await createMigratedDb();
    await db.run(
      "INSERT INTO children (id, name, avatar, age, color, created_at) VALUES ('c1','Ana','cat',7,'#000000','x')",
    );
    const next: Migration = {
      version: LATEST_VERSION + 1,
      name: 'add nickname',
      statements: ["ALTER TABLE children ADD COLUMN nickname TEXT NOT NULL DEFAULT ''"],
    };
    expect(await migrate(db, [...MIGRATIONS, next])).toEqual([LATEST_VERSION + 1]);
    const row = await db.get<{ name: string; nickname: string }>(
      'SELECT name, nickname FROM children',
    );
    expect(row).toEqual({ name: 'Ana', nickname: '' });
  });

  it('rolls back a failing migration completely', async () => {
    const db = await createMigratedDb();
    const bad: Migration = {
      version: LATEST_VERSION + 1,
      name: 'broken',
      statements: ['CREATE TABLE extra (id TEXT)', 'THIS IS NOT SQL'],
    };
    await expect(migrate(db, [...MIGRATIONS, bad])).rejects.toThrow();
    expect(await currentVersion(db)).toBe(LATEST_VERSION);
    expect(await db.get("SELECT name FROM sqlite_master WHERE name = 'extra'")).toBeNull();
  });

  it('makes the stars ledger append-only', async () => {
    const db = await createMigratedDb();
    await db.run(
      "INSERT INTO children (id, name, avatar, age, color, created_at) VALUES ('c1','Ana','cat',7,'#000000','x')",
    );
    await db.run(
      "INSERT INTO stars_ledger (id, child_id, delta, reason, source_type, created_at, local_date) VALUES ('l1','c1',3,'r','adjustment','x','2026-10-11')",
    );
    await expect(db.run('UPDATE stars_ledger SET delta = 100')).rejects.toThrow(/append-only/);
    await expect(db.run('DELETE FROM stars_ledger')).rejects.toThrow(/append-only/);
  });

  it('full reset wipes everything and re-creates the schema', async () => {
    const db = await createMigratedDb();
    await db.run(
      "INSERT INTO children (id, name, avatar, age, color, created_at) VALUES ('c1','Ana','cat',7,'#000000','x')",
    );
    await db.run(
      "INSERT INTO stars_ledger (id, child_id, delta, reason, source_type, created_at, local_date) VALUES ('l1','c1',3,'r','adjustment','x','2026-10-11')",
    );
    await resetDatabase(db);
    expect(await db.get<{ n: number }>('SELECT COUNT(*) AS n FROM children')).toEqual({ n: 0 });
    expect(await db.get<{ n: number }>('SELECT COUNT(*) AS n FROM stars_ledger')).toEqual({ n: 0 });
    expect(await currentVersion(db)).toBe(LATEST_VERSION);
  });
});
