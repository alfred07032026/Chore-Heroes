import { toDateKey } from '@/domain/dates';
import type { Child, Redemption, TaskInstance } from '@/domain/types';
import type { Db, DbExecutor } from '@/db/types';

import { evaluateBadges } from './badges';
import { appendLedger } from './ledger';
import { toInstance, toRedemption, type InstanceRow, type RedemptionRow } from './rows';

export interface InboxItemTask {
  kind: 'task';
  instance: TaskInstance;
}
export interface InboxItemReward {
  kind: 'reward';
  redemption: Redemption;
}
export type InboxItem = (InboxItemTask | InboxItemReward) & {
  child: Pick<Child, 'id' | 'name' | 'avatar' | 'color'>;
};

type ChildCols = { c_name: string; c_avatar: string; c_color: string };

export async function getInbox(db: DbExecutor): Promise<InboxItem[]> {
  const tasks = await db.all<InstanceRow & ChildCols>(
    `SELECT i.*, c.name AS c_name, c.avatar AS c_avatar, c.color AS c_color
     FROM task_instances i JOIN children c ON c.id = i.child_id
     WHERE i.status = 'waiting' ORDER BY i.completed_at`,
  );
  const rewards = await db.all<RedemptionRow & ChildCols>(
    `SELECT r.*, c.name AS c_name, c.avatar AS c_avatar, c.color AS c_color
     FROM redemptions r JOIN children c ON c.id = r.child_id
     WHERE r.status = 'requested' ORDER BY r.requested_at`,
  );
  const items: (InboxItem & { at: string })[] = [
    ...tasks.map((r) => ({
      kind: 'task' as const,
      instance: toInstance(r),
      child: { id: r.child_id, name: r.c_name, avatar: r.c_avatar, color: r.c_color },
      at: r.completed_at ?? '',
    })),
    ...rewards.map((r) => ({
      kind: 'reward' as const,
      redemption: toRedemption(r),
      child: { id: r.child_id, name: r.c_name, avatar: r.c_avatar, color: r.c_color },
      at: r.requested_at,
    })),
  ];
  items.sort((a, b) => a.at.localeCompare(b.at));
  return items.map(({ at: _at, ...rest }) => rest as InboxItem);
}

export async function countInbox(db: DbExecutor): Promise<number> {
  const row = await db.get<{ n: number }>(
    `SELECT (SELECT COUNT(*) FROM task_instances WHERE status = 'waiting')
          + (SELECT COUNT(*) FROM redemptions WHERE status = 'requested') AS n`,
  );
  return row?.n ?? 0;
}

/** Approve a finished job: stars are credited now. Returns false if it was already decided. */
export async function approveTask(
  db: Db,
  instanceId: string,
  note: string | null,
  now = new Date(),
) {
  const childId = await db.transaction(async (tx) => {
    const row = await tx.get<InstanceRow>('SELECT * FROM task_instances WHERE id = ?', [
      instanceId,
    ]);
    if (!row || row.status !== 'waiting') return null;
    const r = await tx.run(
      `UPDATE task_instances SET status = 'done', decided_at = ?, parent_note = ?
       WHERE id = ? AND status = 'waiting'`,
      [now.toISOString(), note, instanceId],
    );
    if (r.changes !== 1) return null;
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
    return row.child_id;
  });
  if (!childId) return { ok: false as const, newBadges: [] as string[] };
  const newBadges = await evaluateBadges(db, childId, toDateKey(now), now);
  return { ok: true as const, newBadges };
}

/** Send a job back ("not quite yet"): it returns to the child's list with an encouraging note. */
export async function rejectTask(
  db: Db,
  instanceId: string,
  note: string | null,
  now = new Date(),
) {
  const r = await db.run(
    `UPDATE task_instances SET status = 'todo', completed_at = NULL, completed_date = NULL,
       decided_at = ?, parent_note = ?, returned = 1
     WHERE id = ? AND status = 'waiting'`,
    [now.toISOString(), note ?? "Let's try that one again!", instanceId],
  );
  return r.changes === 1;
}
