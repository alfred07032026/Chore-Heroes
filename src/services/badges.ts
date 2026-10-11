import { newlyEarnedBadges } from '@/domain/badges';
import type { DateKey } from '@/domain/dates';
import type { Db, DbExecutor } from '@/db/types';

import { badgeStats } from './stats';

export interface EarnedBadge {
  badgeId: string;
  earnedAt: string;
  seen: boolean;
}

export async function listEarnedBadges(db: DbExecutor, childId: string): Promise<EarnedBadge[]> {
  const rows = await db.all<{ badge_id: string; earned_at: string; seen: number }>(
    'SELECT badge_id, earned_at, seen FROM badges_earned WHERE child_id = ? ORDER BY earned_at',
    [childId],
  );
  return rows.map((r) => ({ badgeId: r.badge_id, earnedAt: r.earned_at, seen: r.seen === 1 }));
}

/** Awards any badges the child now qualifies for. Badges are permanent once earned. */
export async function evaluateBadges(
  db: Db,
  childId: string,
  today: DateKey,
  now = new Date(),
): Promise<string[]> {
  const stats = await badgeStats(db, childId, today);
  const have = (await listEarnedBadges(db, childId)).map((b) => b.badgeId);
  const fresh = newlyEarnedBadges(stats, have);
  if (fresh.length === 0) return [];
  await db.transaction(async (tx) => {
    for (const id of fresh) {
      await tx.run(
        'INSERT OR IGNORE INTO badges_earned (child_id, badge_id, earned_at, seen) VALUES (?, ?, ?, 0)',
        [childId, id, now.toISOString()],
      );
    }
  });
  return fresh;
}

export async function unseenBadges(db: DbExecutor, childId: string): Promise<string[]> {
  const rows = await db.all<{ badge_id: string }>(
    'SELECT badge_id FROM badges_earned WHERE child_id = ? AND seen = 0 ORDER BY earned_at',
    [childId],
  );
  return rows.map((r) => r.badge_id);
}

export async function markBadgesSeen(db: Db, childId: string, badgeIds?: string[]): Promise<void> {
  if (badgeIds && badgeIds.length === 0) return;
  if (!badgeIds) {
    await db.run('UPDATE badges_earned SET seen = 1 WHERE child_id = ?', [childId]);
    return;
  }
  await db.run(
    `UPDATE badges_earned SET seen = 1 WHERE child_id = ? AND badge_id IN (${badgeIds.map(() => '?').join(',')})`,
    [childId, ...badgeIds],
  );
}
