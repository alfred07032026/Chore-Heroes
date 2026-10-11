import { toDateKey } from '@/domain/dates';
import { newId } from '@/domain/ids';
import { periodKeyFor, weekdaysToCsv, type Schedule } from '@/domain/recurrence';
import type { Task, TaskInput } from '@/domain/types';
import { hasErrors, validateTask } from '@/domain/validation';
import type { Db, DbExecutor } from '@/db/types';

import { DomainError } from './errors';
import { scheduleOfRow, toTask, type TaskRow } from './rows';

async function assignmentsByTask(db: DbExecutor): Promise<Map<string, string[]>> {
  const rows = await db.all<{ task_id: string; child_id: string }>(
    'SELECT task_id, child_id FROM task_assignments',
  );
  const map = new Map<string, string[]>();
  for (const r of rows) map.set(r.task_id, [...(map.get(r.task_id) ?? []), r.child_id]);
  return map;
}

export async function listTasks(db: DbExecutor, includeArchived = false): Promise<Task[]> {
  const rows = await db.all<TaskRow>(
    `SELECT * FROM tasks ${includeArchived ? '' : 'WHERE archived_at IS NULL'}
     ORDER BY archived_at IS NOT NULL, created_at`,
  );
  const assignments = await assignmentsByTask(db);
  return rows.map((r) => toTask(r, assignments.get(r.id) ?? []));
}

export async function getTask(db: DbExecutor, id: string): Promise<Task | null> {
  const row = await db.get<TaskRow>('SELECT * FROM tasks WHERE id = ?', [id]);
  if (!row) return null;
  const kids = await db.all<{ child_id: string }>(
    'SELECT child_id FROM task_assignments WHERE task_id = ?',
    [id],
  );
  return toTask(
    row,
    kids.map((k) => k.child_id),
  );
}

function clean(input: TaskInput): TaskInput {
  const errors = validateTask(input);
  if (hasErrors(errors)) throw new DomainError('invalid_task', Object.values(errors).join(' '));
  return { ...input, title: input.title.trim(), childIds: [...new Set(input.childIds)] };
}

async function setAssignments(tx: DbExecutor, taskId: string, childIds: string[]) {
  await tx.run('DELETE FROM task_assignments WHERE task_id = ?', [taskId]);
  for (const childId of childIds) {
    await tx.run('INSERT INTO task_assignments (task_id, child_id) VALUES (?, ?)', [
      taskId,
      childId,
    ]);
  }
}

export async function createTask(db: Db, input: TaskInput, now = new Date()): Promise<Task> {
  const t = clean(input);
  return db.transaction(async (tx) => {
    const id = newId('t_');
    const ts = now.toISOString();
    await tx.run(
      `INSERT INTO tasks (id, title, icon, stars, schedule_type, weekdays, start_date, needs_approval, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        t.title,
        t.icon,
        t.stars,
        t.scheduleType,
        weekdaysToCsv(t.weekdays),
        t.startDate,
        t.needsApproval ? 1 : 0,
        ts,
        ts,
      ],
    );
    await setAssignments(tx, id, t.childIds);
    return (await getTask(tx, id))!;
  });
}

/**
 * Removes not-yet-done instances for the current/future periods so they are regenerated
 * from the task's new definition. Completed instances (history) are never touched.
 */
async function dropOpenInstances(
  tx: DbExecutor,
  taskId: string,
  oldSchedule: Schedule,
  today: string,
  onlyChildIds?: string[],
) {
  const currentKey = periodKeyFor(oldSchedule, today);
  const childFilter = onlyChildIds
    ? ` AND child_id IN (${onlyChildIds.map(() => '?').join(',') || "''"})`
    : '';
  await tx.run(
    `DELETE FROM task_instances
     WHERE task_id = ? AND status = 'todo' AND (due_date >= ? OR period_key = ?)${childFilter}`,
    [taskId, today, currentKey, ...(onlyChildIds ?? [])],
  );
}

export async function updateTask(
  db: Db,
  id: string,
  input: TaskInput,
  now = new Date(),
): Promise<Task> {
  const t = clean(input);
  return db.transaction(async (tx) => {
    const before = await tx.get<TaskRow>('SELECT * FROM tasks WHERE id = ?', [id]);
    if (!before) throw new DomainError('not_found', 'Task not found.');
    await tx.run(
      `UPDATE tasks SET title = ?, icon = ?, stars = ?, schedule_type = ?, weekdays = ?, start_date = ?,
         needs_approval = ?, updated_at = ? WHERE id = ?`,
      [
        t.title,
        t.icon,
        t.stars,
        t.scheduleType,
        weekdaysToCsv(t.weekdays),
        t.startDate,
        t.needsApproval ? 1 : 0,
        now.toISOString(),
        id,
      ],
    );
    await setAssignments(tx, id, t.childIds);
    await dropOpenInstances(tx, id, scheduleOfRow(before), toDateKey(now));
    return (await getTask(tx, id))!;
  });
}

export async function archiveTask(db: Db, id: string, now = new Date()): Promise<void> {
  await db.transaction(async (tx) => {
    const before = await tx.get<TaskRow>('SELECT * FROM tasks WHERE id = ?', [id]);
    if (!before) return;
    await tx.run('UPDATE tasks SET archived_at = ?, updated_at = ? WHERE id = ?', [
      now.toISOString(),
      now.toISOString(),
      id,
    ]);
    await dropOpenInstances(tx, id, scheduleOfRow(before), toDateKey(now));
  });
}

export async function restoreTask(db: Db, id: string, now = new Date()): Promise<void> {
  await db.run('UPDATE tasks SET archived_at = NULL, updated_at = ? WHERE id = ?', [
    now.toISOString(),
    id,
  ]);
}
