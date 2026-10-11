import { toDateKey, weekStart } from '@/domain/dates';
import { newId } from '@/domain/ids';
import { checkRedemption, type RedemptionCheck } from '@/domain/rules';
import type { Redemption, Reward, RewardInput } from '@/domain/types';
import { hasErrors, validateReward } from '@/domain/validation';
import type { Db, DbExecutor } from '@/db/types';

import { evaluateBadges } from './badges';
import { DomainError } from './errors';
import { appendLedger, getBalance } from './ledger';
import { toRedemption, toReward, type RedemptionRow, type RewardRow } from './rows';

export async function listRewards(db: DbExecutor, includeArchived = false): Promise<Reward[]> {
  const rows = await db.all<RewardRow>(
    `SELECT * FROM rewards ${includeArchived ? '' : 'WHERE archived_at IS NULL'}
     ORDER BY archived_at IS NOT NULL, cost, created_at`,
  );
  return rows.map(toReward);
}

export async function getReward(db: DbExecutor, id: string): Promise<Reward | null> {
  const row = await db.get<RewardRow>('SELECT * FROM rewards WHERE id = ?', [id]);
  return row ? toReward(row) : null;
}

function clean(input: RewardInput): RewardInput {
  const errors = validateReward(input);
  if (hasErrors(errors)) throw new DomainError('invalid_reward', Object.values(errors).join(' '));
  return { ...input, title: input.title.trim() };
}

export async function createReward(db: Db, input: RewardInput, now = new Date()): Promise<Reward> {
  const r = clean(input);
  const id = newId('r_');
  const ts = now.toISOString();
  await db.run(
    `INSERT INTO rewards (id, title, icon, cost, weekly_limit, needs_approval, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, r.title, r.icon, r.cost, r.weeklyLimit, r.needsApproval ? 1 : 0, ts, ts],
  );
  return (await getReward(db, id))!;
}

export async function updateReward(
  db: Db,
  id: string,
  input: RewardInput,
  now = new Date(),
): Promise<void> {
  const r = clean(input);
  await db.run(
    `UPDATE rewards SET title = ?, icon = ?, cost = ?, weekly_limit = ?, needs_approval = ?, updated_at = ?
     WHERE id = ?`,
    [r.title, r.icon, r.cost, r.weeklyLimit, r.needsApproval ? 1 : 0, now.toISOString(), id],
  );
}

export async function archiveReward(db: Db, id: string, now = new Date()): Promise<void> {
  await db.run('UPDATE rewards SET archived_at = ?, updated_at = ? WHERE id = ?', [
    now.toISOString(),
    now.toISOString(),
    id,
  ]);
}

export async function restoreReward(db: Db, id: string, now = new Date()): Promise<void> {
  await db.run('UPDATE rewards SET archived_at = NULL, updated_at = ? WHERE id = ?', [
    now.toISOString(),
    id,
  ]);
}

async function usedThisWeek(tx: DbExecutor, childId: string, rewardId: string, week: string) {
  const row = await tx.get<{ n: number }>(
    `SELECT COUNT(*) AS n FROM redemptions
     WHERE child_id = ? AND reward_id = ? AND week_key = ? AND status IN ('requested','approved')`,
    [childId, rewardId, week],
  );
  return row?.n ?? 0;
}

export interface ShopItem {
  reward: Reward;
  affordable: boolean;
  missing: number;
  limitReached: boolean;
  pending: boolean;
}

/** Rewards as the child sees them, with affordability and weekly-limit state. */
export async function getShop(
  db: DbExecutor,
  childId: string,
  today: string,
): Promise<{ balance: number; items: ShopItem[] }> {
  const balance = await getBalance(db, childId);
  const rewards = await listRewards(db);
  const counts = await db.all<{ reward_id: string; used: number; pending: number }>(
    `SELECT reward_id,
            SUM(week_key = ? AND status IN ('requested','approved')) AS used,
            SUM(status = 'requested') AS pending
     FROM redemptions WHERE child_id = ? GROUP BY reward_id`,
    [weekStart(today), childId],
  );
  const byReward = new Map(counts.map((c) => [c.reward_id, c]));
  const items: ShopItem[] = rewards.map((reward) => {
    const c = byReward.get(reward.id);
    const used = c?.used ?? 0;
    return {
      reward,
      affordable: balance >= reward.cost,
      missing: Math.max(0, reward.cost - balance),
      limitReached: reward.weeklyLimit !== null && used >= reward.weeklyLimit,
      pending: (c?.pending ?? 0) > 0,
    };
  });
  return { balance, items };
}

export type RedeemResult =
  | { kind: 'requested'; redemption: Redemption }
  | { kind: 'redeemed'; redemption: Redemption; newBadges: string[] }
  | { kind: 'blocked'; check: Exclude<RedemptionCheck, { ok: true }> }
  | { kind: 'unavailable' };

/**
 * Child taps "Get it". Stars are debited immediately (so the balance can never go
 * negative and the same stars cannot be spent twice). A rejected request is refunded.
 */
export async function requestReward(
  db: Db,
  childId: string,
  rewardId: string,
  now = new Date(),
): Promise<RedeemResult> {
  const today = toDateKey(now);
  const week = weekStart(today);
  const result = await db.transaction(async (tx): Promise<RedeemResult> => {
    const reward = await getReward(tx, rewardId);
    if (!reward || reward.archivedAt) return { kind: 'unavailable' };
    const balance = await getBalance(tx, childId);
    const check = checkRedemption({
      balance,
      cost: reward.cost,
      weeklyLimit: reward.weeklyLimit,
      usedThisWeek: await usedThisWeek(tx, childId, rewardId, week),
    });
    if (!check.ok) return { kind: 'blocked', check };

    const id = newId('d_');
    const ts = now.toISOString();
    const status = reward.needsApproval ? 'requested' : 'approved';
    await tx.run(
      `INSERT INTO redemptions (id, reward_id, child_id, title, icon, cost, status, week_key, requested_at, decided_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        rewardId,
        childId,
        reward.title,
        reward.icon,
        reward.cost,
        status,
        week,
        ts,
        status === 'approved' ? ts : null,
      ],
    );
    await appendLedger(
      tx,
      {
        childId,
        delta: -reward.cost,
        reason: `Reward: ${reward.title}`,
        sourceType: 'redemption',
        sourceId: id,
      },
      now,
    );
    const row = await tx.get<RedemptionRow>('SELECT * FROM redemptions WHERE id = ?', [id]);
    const redemption = toRedemption(row!);
    return status === 'requested'
      ? { kind: 'requested', redemption }
      : { kind: 'redeemed', redemption, newBadges: [] };
  });
  if (result.kind === 'redeemed') {
    return { ...result, newBadges: await evaluateBadges(db, childId, today, now) };
  }
  return result;
}

export async function approveRedemption(db: Db, id: string, note: string | null, now = new Date()) {
  const childId = await db.transaction(async (tx) => {
    const row = await tx.get<RedemptionRow>('SELECT * FROM redemptions WHERE id = ?', [id]);
    if (!row || row.status !== 'requested') return null;
    await tx.run(
      `UPDATE redemptions SET status = 'approved', decided_at = ?, parent_note = ?, seen_by_child = 0
       WHERE id = ? AND status = 'requested'`,
      [now.toISOString(), note, id],
    );
    return row.child_id;
  });
  if (!childId) return { ok: false as const, newBadges: [] as string[] };
  return { ok: true as const, newBadges: await evaluateBadges(db, childId, toDateKey(now), now) };
}

/** Decline a reward request: the stars go straight back via a refund ledger row. */
export async function rejectRedemption(db: Db, id: string, note: string | null, now = new Date()) {
  return db.transaction(async (tx) => {
    const row = await tx.get<RedemptionRow>('SELECT * FROM redemptions WHERE id = ?', [id]);
    if (!row || row.status !== 'requested') return false;
    const r = await tx.run(
      `UPDATE redemptions SET status = 'rejected', decided_at = ?, parent_note = ?, seen_by_child = 0
       WHERE id = ? AND status = 'requested'`,
      [now.toISOString(), note ?? 'Not this time — your stars are back in your jar!', id],
    );
    if (r.changes !== 1) return false;
    await appendLedger(
      tx,
      {
        childId: row.child_id,
        delta: row.cost,
        reason: `Refund: ${row.title}`,
        sourceType: 'redemption_refund',
        sourceId: id,
      },
      now,
    );
    return true;
  });
}

export async function listRedemptions(
  db: DbExecutor,
  childId: string,
  limit = 20,
): Promise<Redemption[]> {
  const rows = await db.all<RedemptionRow>(
    'SELECT * FROM redemptions WHERE child_id = ? ORDER BY requested_at DESC LIMIT ?',
    [childId, limit],
  );
  return rows.map(toRedemption);
}

/** Decided requests the child hasn't been told about yet (shown once in the shop). */
export async function unseenDecisions(db: DbExecutor, childId: string): Promise<Redemption[]> {
  const rows = await db.all<RedemptionRow>(
    `SELECT * FROM redemptions WHERE child_id = ? AND status != 'requested' AND seen_by_child = 0
       AND decided_at IS NOT NULL AND decided_at != requested_at
     ORDER BY decided_at`,
    [childId],
  );
  return rows.map(toRedemption);
}

export async function markDecisionsSeen(db: Db, childId: string): Promise<void> {
  await db.run(
    `UPDATE redemptions SET seen_by_child = 1 WHERE child_id = ? AND status != 'requested'`,
    [childId],
  );
}
