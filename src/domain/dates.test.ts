import {
  addDays,
  dateRange,
  dayOfWeek,
  diffDays,
  isDateKey,
  msUntilNextLocalMidnight,
  toDateKey,
  weekDays,
  weekStart,
} from './dates';

describe('dates', () => {
  it('formats local dates', () => {
    expect(toDateKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(toDateKey(new Date(2026, 11, 31, 0, 0))).toBe('2026-12-31');
  });

  it('adds days across month/year boundaries and DST dates', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09'); // US DST start
    expect(addDays('2026-03-29', 1)).toBe('2026-03-30'); // EU DST start
    expect(addDays('2026-11-01', -1)).toBe('2026-10-31');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('computes day differences and ranges', () => {
    expect(diffDays('2026-10-01', '2026-10-11')).toBe(10);
    expect(diffDays('2026-10-11', '2026-10-01')).toBe(-10);
    expect(dateRange('2026-10-30', '2026-11-02')).toEqual([
      '2026-10-30',
      '2026-10-31',
      '2026-11-01',
      '2026-11-02',
    ]);
    expect(dateRange('2026-10-02', '2026-10-01')).toEqual([]);
  });

  it('weeks start on Monday', () => {
    expect(dayOfWeek('2026-10-11')).toBe(0); // Sunday
    expect(weekStart('2026-10-11')).toBe('2026-10-05');
    expect(weekStart('2026-10-05')).toBe('2026-10-05');
    expect(weekStart('2026-10-06')).toBe('2026-10-05');
    expect(weekDays('2026-10-08')).toHaveLength(7);
    expect(weekDays('2026-10-08')[6]).toBe('2026-10-11');
  });

  it('validates keys', () => {
    expect(isDateKey('2026-02-29')).toBe(false);
    expect(isDateKey('2028-02-29')).toBe(true);
    expect(isDateKey('2026-1-1')).toBe(false);
  });

  it('schedules the midnight rollover', () => {
    const now = new Date(2026, 9, 11, 23, 59, 0);
    const ms = msUntilNextLocalMidnight(now);
    expect(ms).toBeGreaterThan(59_000);
    expect(ms).toBeLessThan(61_000);
    expect(toDateKey(new Date(now.getTime() + ms))).toBe('2026-10-12');
  });
});
