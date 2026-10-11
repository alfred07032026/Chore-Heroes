import type { Db } from './types';

export interface Migration {
  version: number;
  name: string;
  /** Statements run inside one transaction. Must never drop or rewrite user data. */
  statements: string[];
}

/**
 * Schema history. RULES (to never lose data):
 * - Never edit a migration that has shipped; append a new one.
 * - Only additive changes (CREATE TABLE/INDEX, ALTER TABLE ADD COLUMN with a default).
 * - If a table must be reshaped: create the new table, INSERT … SELECT from the old one,
 *   then rename — all inside the same migration transaction.
 */
export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    name: 'initial schema',
    statements: [
      `CREATE TABLE settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      )`,
      `CREATE TABLE children (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        avatar TEXT NOT NULL,
        age INTEGER NOT NULL CHECK (age BETWEEN 6 AND 9),
        color TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        archived_at TEXT
      )`,
      `CREATE TABLE tasks (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        icon TEXT NOT NULL,
        stars INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
        schedule_type TEXT NOT NULL CHECK (schedule_type IN ('once','daily','weekdays','weekly')),
        weekdays TEXT NOT NULL DEFAULT '',
        start_date TEXT NOT NULL,
        needs_approval INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        archived_at TEXT
      )`,
      `CREATE TABLE task_assignments (
        task_id TEXT NOT NULL REFERENCES tasks(id),
        child_id TEXT NOT NULL REFERENCES children(id),
        PRIMARY KEY (task_id, child_id)
      )`,
      `CREATE TABLE task_instances (
        id TEXT PRIMARY KEY NOT NULL,
        task_id TEXT NOT NULL REFERENCES tasks(id),
        child_id TEXT NOT NULL REFERENCES children(id),
        period_key TEXT NOT NULL,
        due_date TEXT NOT NULL,
        title TEXT NOT NULL,
        icon TEXT NOT NULL,
        stars INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','waiting','done')),
        completed_at TEXT,
        completed_date TEXT,
        decided_at TEXT,
        parent_note TEXT,
        returned INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        UNIQUE (task_id, child_id, period_key)
      )`,
      `CREATE INDEX idx_instances_child_due ON task_instances (child_id, due_date)`,
      `CREATE INDEX idx_instances_status ON task_instances (status)`,
      `CREATE TABLE rewards (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        icon TEXT NOT NULL,
        cost INTEGER NOT NULL CHECK (cost > 0),
        weekly_limit INTEGER,
        needs_approval INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        archived_at TEXT
      )`,
      `CREATE TABLE redemptions (
        id TEXT PRIMARY KEY NOT NULL,
        reward_id TEXT NOT NULL REFERENCES rewards(id),
        child_id TEXT NOT NULL REFERENCES children(id),
        title TEXT NOT NULL,
        icon TEXT NOT NULL,
        cost INTEGER NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('requested','approved','rejected')),
        week_key TEXT NOT NULL,
        requested_at TEXT NOT NULL,
        decided_at TEXT,
        parent_note TEXT,
        seen_by_child INTEGER NOT NULL DEFAULT 0
      )`,
      `CREATE INDEX idx_redemptions_child_week ON redemptions (child_id, reward_id, week_key)`,
      `CREATE TABLE stars_ledger (
        id TEXT PRIMARY KEY NOT NULL,
        child_id TEXT NOT NULL REFERENCES children(id),
        delta INTEGER NOT NULL,
        reason TEXT NOT NULL,
        source_type TEXT NOT NULL CHECK (source_type IN
          ('task_instance','task_undo','redemption','redemption_refund','adjustment')),
        source_id TEXT,
        created_at TEXT NOT NULL,
        local_date TEXT NOT NULL
      )`,
      `CREATE INDEX idx_ledger_child ON stars_ledger (child_id, local_date)`,
      // The ledger is append-only: corrections are new rows, never edits.
      `CREATE TRIGGER stars_ledger_no_update BEFORE UPDATE ON stars_ledger
        BEGIN SELECT RAISE(ABORT, 'stars_ledger is append-only'); END`,
      `CREATE TRIGGER stars_ledger_no_delete BEFORE DELETE ON stars_ledger
        BEGIN SELECT RAISE(ABORT, 'stars_ledger is append-only'); END`,
      `CREATE TABLE badges_earned (
        child_id TEXT NOT NULL REFERENCES children(id),
        badge_id TEXT NOT NULL,
        earned_at TEXT NOT NULL,
        seen INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (child_id, badge_id)
      )`,
    ],
  },
];

export const LATEST_VERSION = MIGRATIONS[MIGRATIONS.length - 1]?.version ?? 0;

export async function currentVersion(db: Db): Promise<number> {
  await db.exec(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    )`,
  );
  const row = await db.get<{ v: number | null }>('SELECT MAX(version) AS v FROM schema_migrations');
  return row?.v ?? 0;
}

/** Applies every pending migration, each in its own transaction. Safe to call on every launch. */
export async function migrate(
  db: Db,
  migrations: readonly Migration[] = MIGRATIONS,
  now: () => Date = () => new Date(),
): Promise<number[]> {
  const from = await currentVersion(db);
  const applied: number[] = [];
  const pending = [...migrations]
    .filter((m) => m.version > from)
    .sort((a, b) => a.version - b.version);
  for (const m of pending) {
    await db.transaction(async (tx) => {
      for (const sql of m.statements) await tx.exec(sql);
      await tx.run('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)', [
        m.version,
        m.name,
        now().toISOString(),
      ]);
    });
    applied.push(m.version);
  }
  return applied;
}

const ALL_TABLES = [
  'badges_earned',
  'stars_ledger',
  'redemptions',
  'rewards',
  'task_instances',
  'task_assignments',
  'tasks',
  'children',
  'settings',
  'schema_migrations',
];

/** Full data reset (explicit parent action only): drop everything, then rebuild the schema. */
export async function resetDatabase(db: Db): Promise<void> {
  await db.transaction(async (tx) => {
    for (const t of ALL_TABLES) await tx.exec(`DROP TABLE IF EXISTS ${t}`);
  });
  await migrate(db);
}

export const EXPORT_TABLES = ALL_TABLES.filter((t) => t !== 'schema_migrations');
