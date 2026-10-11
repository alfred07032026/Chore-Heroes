import { type DateKey, weekDays, weekStart } from '@/domain/dates';
import { completionRate } from '@/domain/rules';
import type { BadgeStats } from '@/domain/badges';
import { computeStreak, type StreakInfo } from '@/domain/streaks';
import type { DbExecutor } from '@/db/types';

import { getBalance } from './ledger';

export async function activeDays(db: DbExecutor, childId: string): Promise<DateKey[]> {
  const rows = await db.all<{ d: string }>(
    `SELECT DISTINCT completed_date AS d FROM task_instances
     WHERE child_id = ? AND status IN ('waiting','done') AND completed_date IS NOT NULL`,
    [childId],
  );
  return rows.map((r) => r.d);
}

export async function getStreak(
  db: DbExecutor,
  childId: string,
  today: DateKey,
): Promise<StreakInfo> {
  return computeStreak(await activeDays(db, childId), today);
}

/**
 * Badge stats and streak in one pass.
 * "Perfect day" = a day with ≥2 date-scheduled jobs, every one of them approved/done
 * (jobs still waiting for a parent don't count yet, so a later "not yet" can't leave a
 * badge behind for a day that wasn't perfect).
 */
export async function childStats(
  db: DbExecutor,
  childId: string,
  today: DateKey,
): Promise<{ badges: BadgeStats; streak: StreakInfo }> {
  const streak = await getStreak(db, childId, today);
  const row = await db.get<{
    tasks: number;
    stars: number | null;
    rewards: number;
    perfect: number;
  }>(
    `SELECT
       (SELECT COUNT(*) FROM task_instances WHERE child_id = ?1 AND status = 'done') AS tasks,
       (SELECT SUM(delta) FROM stars_ledger WHERE child_id = ?1
          AND source_type IN ('task_instance','task_undo')) AS stars,
       (SELECT COUNT(*) FROM redemptions WHERE child_id = ?1 AND status = 'approved') AS rewards,
       (SELECT COUNT(*) FROM (
          SELECT due_date FROM task_instances
          WHERE child_id = ?1 AND period_key = due_date
          GROUP BY due_date
          HAVING COUNT(*) >= 2 AND SUM(status != 'done') = 0)) AS perfect`,
    [childId],
  );
  return {
    streak,
    badges: {
      tasksDone: row?.tasks ?? 0,
      lifetimeStars: Math.max(0, row?.stars ?? 0),
      rewardsRedeemed: row?.rewards ?? 0,
      perfectDays: row?.perfect ?? 0,
      currentStreak: streak.current,
      bestStreak: streak.best,
    },
  };
}

export interface ChildDashboard {
  balance: number;
  starsThisWeek: number;
  /** Mon..Sun stars earned from jobs (undo rows included, so it nets out). */
  week: { date: DateKey; stars: number }[];
  dueThisWeek: number;
  doneThisWeek: number;
  completionRate: number | null;
  streak: StreakInfo;
  tasksDone: number;
  lifetimeStars: number;
}

export async function getChildDashboard(
  db: DbExecutor,
  childId: string,
  today: DateKey,
): Promise<ChildDashboard> {
  const days = weekDays(today);
  const start = weekStart(today);
  const byDay = await db.all<{ d: string; s: number }>(
    `SELECT local_date AS d, SUM(delta) AS s FROM stars_ledger
     WHERE child_id = ? AND source_type IN ('task_instance','task_undo') AND local_date BETWEEN ? AND ?
     GROUP BY local_date`,
    [childId, start, days[6]!],
  );
  const map = new Map(byDay.map((r) => [r.d, r.s]));
  const week = days.map((date) => ({ date, stars: Math.max(0, map.get(date) ?? 0) }));

  const counts = await db.get<{ due: number; done: number }>(
    `SELECT COUNT(*) AS due, COALESCE(SUM(status != 'todo'), 0) AS done FROM task_instances
     WHERE child_id = ? AND due_date BETWEEN ? AND ?`,
    [childId, start, today],
  );
  const { badges: stats, streak } = await childStats(db, childId, today);
  return {
    balance: await getBalance(db, childId),
    starsThisWeek: week.reduce((s, d) => s + d.stars, 0),
    week,
    dueThisWeek: counts?.due ?? 0,
    doneThisWeek: counts?.done ?? 0,
    completionRate: completionRate(counts?.done ?? 0, counts?.due ?? 0),
    streak,
    tasksDone: stats.tasksDone,
    lifetimeStars: stats.lifetimeStars,
  };
}
