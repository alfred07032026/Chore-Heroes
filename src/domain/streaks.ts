import { addDays, type DateKey } from './dates';

export interface StreakInfo {
  /** Consecutive active days ending today (or yesterday if today isn't done yet). */
  current: number;
  /** Longest run ever. */
  best: number;
  /** Has the child already been active today? */
  todayDone: boolean;
  /** True when a previous streak ended (used for a gentle, encouraging restart message). */
  restarting: boolean;
}

/**
 * Streak rules (deliberately kind — no "you lost it" shaming):
 * - A day counts when at least one task was completed (approved or waiting for approval).
 * - Today not being done yet never breaks the streak; it stays alive until the day ends.
 */
export function computeStreak(activeDays: Iterable<DateKey>, today: DateKey): StreakInfo {
  const days = new Set<DateKey>();
  for (const d of activeDays) if (d <= today) days.add(d);

  const todayDone = days.has(today);
  let cursor = todayDone ? today : addDays(today, -1);
  let current = 0;
  while (days.has(cursor)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  let best = 0;
  const sorted = [...days].sort();
  let run = 0;
  let prev: DateKey | null = null;
  for (const d of sorted) {
    run = prev !== null && addDays(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }

  return { current, best, todayDone, restarting: current === 0 && days.size > 0 };
}

/** Friendly, non-shaming streak copy (spoken and shown). */
export function streakMessage(info: StreakInfo, name: string): string {
  if (info.current === 0 && info.restarting) {
    return `Welcome back, ${name}! Every hero starts fresh. Let's light the flame again!`;
  }
  if (info.current === 0) return `Do one job to light your hero flame, ${name}!`;
  if (!info.todayDone) {
    return `Your flame is ${info.current} ${info.current === 1 ? 'day' : 'days'} strong. One job keeps it glowing!`;
  }
  return `Wow! ${info.current} ${info.current === 1 ? 'day' : 'days'} in a row!`;
}
