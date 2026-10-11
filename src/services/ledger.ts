import { toDateKey } from '@/domain/dates';
import { newId } from '@/domain/ids';
import { checkAdjustment } from '@/domain/rules';
import type { LedgerEntry, LedgerSource } from '@/domain/types';
import type { Db, DbExecutor } from '@/db/types';

import { DomainError } from './errors';
import { toLedger, type LedgerRow } from './rows';

/** The ONLY way stars move. Rows are never updated or deleted (enforced by DB triggers). */
export async function appendLedger(
  tx: DbExecutor,
  entry: {
    childId: string;
    delta: number;
    reason: string;
    sourceType: LedgerSource;
    sourceId: string | null;
  },
  now: Date,
): Promise<string> {
  const id = newId('l_');
  await tx.run(
    `INSERT INTO stars_ledger (id, child_id, delta, reason, source_type, source_id, created_at, local_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      entry.childId,
      entry.delta,
      entry.reason,
      entry.sourceType,
      entry.sourceId,
      now.toISOString(),
      toDateKey(now),
    ],
  );
  return id;
}

/** Balance is always derived from the ledger, never stored. */
export async function getBalance(db: DbExecutor, childId: string): Promise<number> {
  const row = await db.get<{ b: number | null }>(
    'SELECT COALESCE(SUM(delta), 0) AS b FROM stars_ledger WHERE child_id = ?',
    [childId],
  );
  return row?.b ?? 0;
}

export async function getBalances(db: DbExecutor): Promise<Record<string, number>> {
  const rows = await db.all<{ child_id: string; b: number }>(
    'SELECT child_id, SUM(delta) AS b FROM stars_ledger GROUP BY child_id',
  );
  return Object.fromEntries(rows.map((r) => [r.child_id, r.b]));
}

export async function getLedger(
  db: DbExecutor,
  childId: string,
  limit = 50,
): Promise<LedgerEntry[]> {
  const rows = await db.all<LedgerRow>(
    'SELECT * FROM stars_ledger WHERE child_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ?',
    [childId, limit],
  );
  return rows.map(toLedger);
}

/** Manual parent adjustment. A reason is mandatory and the balance may not go negative. */
export async function adjustStars(
  db: Db,
  childId: string,
  delta: number,
  reason: string,
  now: Date = new Date(),
): Promise<number> {
  return db.transaction(async (tx) => {
    const balance = await getBalance(tx, childId);
    const check = checkAdjustment({ balance, delta, reason });
    if (!check.ok) throw new DomainError(check.reason, `Adjustment rejected: ${check.reason}`);
    await appendLedger(
      tx,
      {
        childId,
        delta,
        reason: `Adjustment: ${reason.trim()}`,
        sourceType: 'adjustment',
        sourceId: null,
      },
      now,
    );
    return balance + delta;
  });
}
