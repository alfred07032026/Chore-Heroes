import { addDays, type DateKey, toDateKey, weekStart } from '@/domain/dates';
import { newId } from '@/domain/ids';
import { duePeriods, isDueOn, periodKeyFor, periodRange } from '@/domain/recurrence';
import type { TaskInstance } from '@/domain/types';
import type { Db, DbExecutor } from '@/db/types';

import { evaluateBadges } from './badges';
import { appendLedger, getBalance } from './ledger';
import { scheduleOfRow, toInstance, type InstanceRow, type TaskRow } from './rows';

/** How far back instances are back-filled so missed days show up in history and stats. */
export const BACKFILL_DAYS = 13;

interface ActiveAssignment extends TaskRow {
  child_id: string;
}

async function activeAssignments(db: DbExecutor, childId?: string): Promise<ActiveAssignment[]> {
  return db.all<ActiveAssignment>(
    `SELECT t.*, a.child_id FROM tasks t
     JOIN task_assignments a ON a.task_id = t.id
     JOIN children c ON c.id = a.child_id
     WHERE t.archived_at IS NULL AND c.archived_at IS NULL ${childId ? 'AND a.child_id = ?' : ''}`,
    childId ? [childId] : [],
  );
}

/**
 * Materializes one instance per (task, child, period) for every due period in [from, to].
 *
 * - Idempotent: UNIQUE(task_id, child_id, period_key) means re-running never duplicates and
 *   an existing instance is never overwritten.
 * - Read-first: only opens a write transaction when something is actually missing, so the
 *   common case (Today screen refresh) costs two reads.
 * - Never re-offers a job already finished in the same period under an older schedule
 *   (e.g. a finished daily job switched to weekly mid-week cannot be earned twice).
 */
export async function ensureInstances(
  db: Db,
  range: { from: DateKey; to: DateKey },
  childId?: string,
  now = new Date(),
): Promise<number> {
  const rows = await activeAssignments(db, childId);
  if (rows.length === 0) return 0;

  const existing = await db.all<{ task_id: string; child_id: string; period_key: string }>(
    `SELECT task_id, child_id, period_key FROM task_instances
     WHERE (due_date >= ? OR period_key = 'once') ${childId ? 'AND child_id = ?' : ''}`,
    childId ? [addDays(range.from, -7), childId] : [addDays(range.from, -7)],
  );
  const have = new Set(existing.map((e) => `${e.task_id}|${e.child_id}|${e.period_key}`));

  const missing: {
    t: ActiveAssignment;
    periodKey: string;
    dueDate: DateKey;
    from: DateKey;
    to: DateKey;
  }[] = [];
  for (const t of rows) {
    const schedule = scheduleOfRow(t);
    for (const p of duePeriods(schedule, range.from, range.to)) {
      if (have.has(`${t.id}|${t.child_id}|${p.periodKey}`)) continue;
      const r = periodRange(schedule, p.dueDate);
      missing.push({ t, periodKey: p.periodKey, dueDate: p.dueDate, from: r.from, to: r.to });
    }
  }
  if (missing.length === 0) return 0;

  return db.transaction(async (tx) => {
    let created = 0;
    for (const m of missing) {
      const r = await tx.run(
        `INSERT OR IGNORE INTO task_instances
           (id, task_id, child_id, period_key, due_date, title, icon, stars, status, created_at)
         SELECT ?, ?, ?, ?, ?, ?, ?, ?, 'todo', ?
         WHERE NOT EXISTS (
           SELECT 1 FROM task_instances
           WHERE task_id = ? AND child_id = ? AND period_key != ? AND status != 'todo'
             AND completed_date BETWEEN ? AND ?)`,
        [
          newId('i_'),
          m.t.id,
          m.t.child_id,
          m.periodKey,
          m.dueDate,
          m.t.title,
          m.t.icon,
          m.t.stars,
          now.toISOString(),
          m.t.id,
          m.t.child_id,
          m.periodKey,
          m.from,
          m.to,
        ],
      );
      created += r.changes;
    }
    return created;
  });
}

export async function backfillAll(db: Db, today: DateKey, now = new Date()): Promise<number> {
  return ensureInstances(db, { from: addDays(today, -BACKFILL_DAYS), to: today }, undefined, now);
}

export interface TodayBoard {
  todo: TaskInstance[];
  waiting: TaskInstance[];
  done: TaskInstance[];
}

/** The child's Today screen: current-period instances of active, assigned tasks. */
export async function getToday(
  db: Db,
  childId: string,
  today: DateKey,
  now = new Date(),
): Promise<TodayBoard> {
  await ensureInstances(db, { from: today, to: today }, childId, now);
  const rows = await db.all<
    InstanceRow & { schedule_type: string; weekdays: string; start_date: string }
  >(
    `SELECT i.*, t.schedule_type, t.weekdays, t.start_date FROM task_instances i
     JOIN tasks t ON t.id = i.task_id
     JOIN task_assignments a ON a.task_id = t.id AND a.child_id = i.child_id
     WHERE i.child_id = ? AND t.archived_at IS NULL AND i.period_key IN (?, ?, 'once')
     ORDER BY i.created_at, i.rowid`,
    [childId, today, `week:${weekStart(today)}`],
  );
  const board: TodayBoard = { todo: [], waiting: [], done: [] };
  for (const r of rows) {
    const schedule = scheduleOfRow(r);
    if (!isDueOn(schedule, today) || r.period_key !== periodKeyFor(schedule, today)) continue;
    const inst = toInstance(r);
    if (inst.status === 'todo') board.todo.push(inst);
    else if (inst.status === 'waiting') board.waiting.push(inst);
    else if (
      inst.completedDate === today ||
      schedule.type === 'daily' ||
      schedule.type === 'weekdays'
    )
      board.done.push(inst);
    // weekly/once jobs finished on an earlier day: nothing to show today.
  }
  board.done.sort((a, b) => (a.completedAt ?? '').localeCompare(b.completedAt ?? ''));
  return board;
}

export type CompleteResult =
  | { kind: 'done'; stars: number; newBadges: string[] }
  | { kind: 'waiting' }
  | { kind: 'already' }
  | { kind: 'expired' };

/** Child checks off a job. Atomic: a job can only ever move out of 'todo' once per period. */
export async function completeInstance(
  db: Db,
  instanceId: string,
  now = new Date(),
): Promise<CompleteResult> {
  const today = toDateKey(now);
  const result = await db.transaction(
    async (tx): Promise<CompleteResult & { childId?: string }> => {
      const row = await tx.get<InstanceRow & TaskRow & { needs: number }>(
        `SELECT i.*, t.schedule_type, t.weekdays, t.start_date, t.needs_approval AS needs FROM task_instances i
       JOIN tasks t ON t.id = i.task_id WHERE i.id = ?`,
        [instanceId],
      );
      if (!row || row.status !== 'todo') return { kind: 'already' };
      const schedule = scheduleOfRow(row);
      if (periodKeyFor(schedule, today) !== row.period_key || !isDueOn(schedule, today)) {
        return { kind: 'expired' };
      }
      const ts = now.toISOString();
      if (row.needs === 1) {
        const r = await tx.run(
          `UPDATE task_instances SET status = 'waiting', completed_at = ?, completed_date = ?, returned = 0
         WHERE id = ? AND status = 'todo'`,
          [ts, today, instanceId],
        );
        return r.changes === 1 ? { kind: 'waiting' } : { kind: 'already' };
      }
      const r = await tx.run(
        `UPDATE task_instances SET status = 'done', completed_at = ?, completed_date = ?, decided_at = ?, returned = 0
       WHERE id = ? AND status = 'todo'`,
        [ts, today, ts, instanceId],
      );
      if (r.changes !== 1) return { kind: 'already' };
      await appendLedger(
        tx,
        {
          childId: row.child_id,
          delta: row.stars,
          reason: `Task: ${row.title}`,
          sourceType: 'task_instance',
          sourceId: instanceId,
        },
        now,
      );
      return { kind: 'done', stars: row.stars, newBadges: [], childId: row.child_id };
    },
  );
  if (result.kind === 'done' && result.childId) {
    const newBadges = await evaluateBadges(db, result.childId, today, now);
    return { kind: 'done', stars: result.stars, newBadges };
  }
  if (result.kind === 'done') return { kind: 'done', stars: result.stars, newBadges: [] };
  return result;
}

export type UndoResult =
  { kind: 'undone' } | { kind: 'too_late' } | { kind: 'parent_checked' } | { kind: 'stars_spent' };

/**
 * "Oops, not done yet": a child can undo their own check-off on the same day.
 * Auto-awarded stars are taken back with a compensating ledger row (never by editing history).
 * Parent-approved jobs cannot be undone by the child.
 */
export async function undoInstance(
  db: Db,
  instanceId: string,
  now = new Date(),
): Promise<UndoResult> {
  const today = toDateKey(now);
  return db.transaction(async (tx) => {
    const row = await tx.get<InstanceRow>('SELECT * FROM task_instances WHERE id = ?', [
      instanceId,
    ]);
    if (!row || row.completed_date !== today) return { kind: 'too_late' };
    if (row.status === 'waiting') {
      await tx.run(
        `UPDATE task_instances SET status = 'todo', completed_at = NULL, completed_date = NULL
         WHERE id = ? AND status = 'waiting'`,
        [instanceId],
      );
      return { kind: 'undone' };
    }
    const autoApproved = row.status === 'done' && row.decided_at === row.completed_at;
    if (!autoApproved) return { kind: 'parent_checked' };
    if ((await getBalance(tx, row.child_id)) < row.stars) return { kind: 'stars_spent' };
    await tx.run(
      `UPDATE task_instances SET status = 'todo', completed_at = NULL, completed_date = NULL, decided_at = NULL
       WHERE id = ? AND status = 'done'`,
      [instanceId],
    );
    await appendLedger(
      tx,
      {
        childId: row.child_id,
        delta: -row.stars,
        reason: `Undo: ${row.title}`,
        sourceType: 'task_undo',
        sourceId: instanceId,
      },
      now,
    );
    return { kind: 'undone' };
  });
}
