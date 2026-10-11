import { addDays, dateRange, dayOfWeek, type DateKey, weekStart } from './dates';

export type ScheduleType = 'once' | 'daily' | 'weekdays' | 'weekly';

export interface Schedule {
  type: ScheduleType;
  /** Days of week (0 = Sun … 6 = Sat). Only used when type === 'weekdays'. */
  weekdays: number[];
  /** First local date the task can appear. */
  startDate: DateKey;
}

/**
 * Period key identifying the single instance a child can complete for a given date.
 * - daily / weekdays: the date itself (one per due day)
 * - weekly: the Monday of that week (one per week, visible all week)
 * - once: a constant (one ever)
 */
export function periodKeyFor(schedule: Schedule, date: DateKey): string {
  switch (schedule.type) {
    case 'daily':
    case 'weekdays':
      return date;
    case 'weekly':
      return `week:${weekStart(date)}`;
    case 'once':
      return 'once';
  }
}

/** Is the task active (should have an instance) on `date`? */
export function isDueOn(schedule: Schedule, date: DateKey): boolean {
  if (date < schedule.startDate) return false;
  switch (schedule.type) {
    case 'daily':
    case 'weekly':
    case 'once':
      return true;
    case 'weekdays':
      return schedule.weekdays.includes(dayOfWeek(date));
  }
}

/**
 * Distinct periods in [from, to] for which an instance should exist.
 * Used to back-fill history for dashboards (so missed days count as missed).
 */
export function duePeriods(
  schedule: Schedule,
  from: DateKey,
  to: DateKey,
): { periodKey: string; dueDate: DateKey }[] {
  const out: { periodKey: string; dueDate: DateKey }[] = [];
  const seen = new Set<string>();
  const start = from < schedule.startDate ? schedule.startDate : from;
  for (const date of dateRange(start, to)) {
    if (!isDueOn(schedule, date)) continue;
    const periodKey = periodKeyFor(schedule, date);
    if (seen.has(periodKey)) continue;
    seen.add(periodKey);
    out.push({ periodKey, dueDate: schedule.type === 'once' ? schedule.startDate : date });
  }
  return out;
}

export function normalizeWeekdays(days: number[]): number[] {
  return [...new Set(days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort(
    (a, b) => a - b,
  );
}

export function weekdaysToCsv(days: number[]): string {
  return normalizeWeekdays(days).join(',');
}

export function csvToWeekdays(csv: string | null | undefined): number[] {
  if (!csv) return [];
  return normalizeWeekdays(csv.split(',').map((s) => Number(s.trim())));
}

/** Last day of the period that contains `date` (inclusive). */
export function periodEnd(schedule: Schedule, date: DateKey): DateKey | null {
  switch (schedule.type) {
    case 'daily':
    case 'weekdays':
      return date;
    case 'weekly':
      return addDays(weekStart(date), 6);
    case 'once':
      return null;
  }
}

export function describeSchedule(schedule: Schedule): string {
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  switch (schedule.type) {
    case 'daily':
      return 'Every day';
    case 'weekly':
      return 'Once a week';
    case 'once':
      return 'One time';
    case 'weekdays': {
      const days = normalizeWeekdays(schedule.weekdays);
      if (days.join() === '1,2,3,4,5') return 'School days (Mon–Fri)';
      if (days.join() === '0,6') return 'Weekends';
      return days.map((d) => names[d]).join(', ') || 'No days picked';
    }
  }
}
