import { newId } from '@/domain/ids';
import type { Child, ChildInput } from '@/domain/types';
import { hasErrors, MAX_CHILDREN, validateChild } from '@/domain/validation';
import type { Db, DbExecutor } from '@/db/types';

import { DomainError } from './errors';
import { toChild, type ChildRow } from './rows';

export async function listChildren(db: DbExecutor, includeArchived = false): Promise<Child[]> {
  const rows = await db.all<ChildRow>(
    `SELECT * FROM children ${includeArchived ? '' : 'WHERE archived_at IS NULL'}
     ORDER BY sort_order, created_at`,
  );
  return rows.map(toChild);
}

export async function getChild(db: DbExecutor, id: string): Promise<Child | null> {
  const row = await db.get<ChildRow>('SELECT * FROM children WHERE id = ?', [id]);
  return row ? toChild(row) : null;
}

export async function countActiveChildren(db: DbExecutor): Promise<number> {
  const row = await db.get<{ n: number }>(
    'SELECT COUNT(*) AS n FROM children WHERE archived_at IS NULL',
  );
  return row?.n ?? 0;
}

function clean(input: ChildInput): ChildInput {
  const errors = validateChild(input);
  if (hasErrors(errors)) throw new DomainError('invalid_child', Object.values(errors).join(' '));
  return { ...input, name: input.name.trim() };
}

export async function createChild(db: Db, input: ChildInput, now = new Date()): Promise<Child> {
  const c = clean(input);
  return db.transaction(async (tx) => {
    if ((await countActiveChildren(tx)) >= MAX_CHILDREN)
      throw new DomainError('too_many_children', `You can add up to ${MAX_CHILDREN} children.`);
    const id = newId('c_');
    const order = await tx.get<{ n: number | null }>('SELECT MAX(sort_order) AS n FROM children');
    await tx.run(
      `INSERT INTO children (id, name, avatar, age, color, sort_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, c.name, c.avatar, c.age, c.color, (order?.n ?? -1) + 1, now.toISOString()],
    );
    const child = await getChild(tx, id);
    return child!;
  });
}

export async function updateChild(db: Db, id: string, input: ChildInput): Promise<void> {
  const c = clean(input);
  await db.run('UPDATE children SET name = ?, avatar = ?, age = ?, color = ? WHERE id = ?', [
    c.name,
    c.avatar,
    c.age,
    c.color,
    id,
  ]);
}

/** Archive (never delete): keeps ledger and history intact. At least one child must remain. */
export async function archiveChild(db: Db, id: string, now = new Date()): Promise<void> {
  await db.transaction(async (tx) => {
    if ((await countActiveChildren(tx)) <= 1)
      throw new DomainError('last_child', 'At least one child profile is needed.');
    await tx.run('UPDATE children SET archived_at = ? WHERE id = ? AND archived_at IS NULL', [
      now.toISOString(),
      id,
    ]);
  });
}

export async function restoreChild(db: Db, id: string): Promise<void> {
  await db.transaction(async (tx) => {
    if ((await countActiveChildren(tx)) >= MAX_CHILDREN)
      throw new DomainError('too_many_children', `You can have up to ${MAX_CHILDREN} children.`);
    await tx.run('UPDATE children SET archived_at = NULL WHERE id = ?', [id]);
  });
}
