/**
 * Calendar-date helpers.
 *
 * A DateKey ("YYYY-MM-DD") is always the *device-local* calendar date at the moment an
 * event happened. Arithmetic on keys is done in UTC so it is immune to DST jumps and the
 * device's current time zone: a key never shifts once written.
 */
export type DateKey = string;

const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar date of an instant. */
export function toDateKey(d: Date): DateKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function isDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const { y, m, d } = parts(value);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function parts(key: DateKey): { y: number; m: number; d: number } {
  const [y, m, d] = key.split('-').map(Number);
  return { y: y ?? 1970, m: m ?? 1, d: d ?? 1 };
}

function toUtc(key: DateKey): number {
  const { y, m, d } = parts(key);
  return Date.UTC(y, m - 1, d);
}

function fromUtc(ms: number): DateKey {
  const dt = new Date(ms);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

const DAY_MS = 86_400_000;

export function addDays(key: DateKey, days: number): DateKey {
  return fromUtc(toUtc(key) + days * DAY_MS);
}

/** Whole days from a to b (b - a). */
export function diffDays(a: DateKey, b: DateKey): number {
  return Math.round((toUtc(b) - toUtc(a)) / DAY_MS);
}

/** 0 = Sunday … 6 = Saturday */
export function dayOfWeek(key: DateKey): number {
  return new Date(toUtc(key)).getUTCDay();
}

/** Weeks start on Monday (ISO 8601). */
export function weekStart(key: DateKey): DateKey {
  const dow = dayOfWeek(key);
  const offset = (dow + 6) % 7; // Monday → 0, Sunday → 6
  return addDays(key, -offset);
}

/** The 7 keys (Mon…Sun) of the week containing `key`. */
export function weekDays(key: DateKey): DateKey[] {
  const start = weekStart(key);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** Inclusive range of keys from `from` to `to`. Empty when from > to. */
export function dateRange(from: DateKey, to: DateKey): DateKey[] {
  const n = diffDays(from, to);
  if (n < 0) return [];
  return Array.from({ length: n + 1 }, (_, i) => addDays(from, i));
}

/** Milliseconds until the next local midnight (+ a small safety margin). */
export function msUntilNextLocalMidnight(now: Date): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 50);
  return Math.max(1_000, next.getTime() - now.getTime());
}

export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export const WEEKDAY_LONG = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;
