import {
  csvToWeekdays,
  describeSchedule,
  duePeriods,
  isDueOn,
  periodKeyFor,
  type Schedule,
} from './recurrence';

const s = (over: Partial<Schedule>): Schedule => ({
  type: 'daily',
  weekdays: [],
  startDate: '2026-10-01',
  ...over,
});

describe('recurrence', () => {
  it('daily tasks are due every day from the start date', () => {
    expect(isDueOn(s({}), '2026-09-30')).toBe(false);
    expect(isDueOn(s({}), '2026-10-01')).toBe(true);
    expect(periodKeyFor(s({}), '2026-10-05')).toBe('2026-10-05');
  });

  it('weekday tasks are due only on picked days', () => {
    const sched = s({ type: 'weekdays', weekdays: [1, 3] }); // Mon, Wed
    expect(isDueOn(sched, '2026-10-05')).toBe(true); // Mon
    expect(isDueOn(sched, '2026-10-06')).toBe(false); // Tue
    expect(isDueOn(sched, '2026-10-07')).toBe(true); // Wed
  });

  it('weekly tasks share one period per Monday-based week', () => {
    const sched = s({ type: 'weekly' });
    expect(periodKeyFor(sched, '2026-10-05')).toBe('week:2026-10-05');
    expect(periodKeyFor(sched, '2026-10-11')).toBe('week:2026-10-05');
    expect(periodKeyFor(sched, '2026-10-12')).toBe('week:2026-10-12');
  });

  it('one-time tasks have a single period', () => {
    const sched = s({ type: 'once', startDate: '2026-10-03' });
    expect(periodKeyFor(sched, '2026-10-03')).toBe('once');
    expect(periodKeyFor(sched, '2026-10-20')).toBe('once');
    expect(isDueOn(sched, '2026-10-02')).toBe(false);
  });

  it('lists due periods for back-filling without duplicates', () => {
    expect(duePeriods(s({ startDate: '2026-10-09' }), '2026-10-05', '2026-10-11')).toHaveLength(3);
    const weekly = duePeriods(s({ type: 'weekly' }), '2026-10-01', '2026-10-14');
    expect(weekly.map((p) => p.periodKey)).toEqual([
      'week:2026-09-28',
      'week:2026-10-05',
      'week:2026-10-12',
    ]);
    expect(duePeriods(s({ type: 'once' }), '2026-10-01', '2026-10-30')).toEqual([
      { periodKey: 'once', dueDate: '2026-10-01' },
    ]);
    const wd = duePeriods(s({ type: 'weekdays', weekdays: [6] }), '2026-10-01', '2026-10-14');
    expect(wd.map((p) => p.dueDate)).toEqual(['2026-10-03', '2026-10-10']);
  });

  it('parses and describes schedules', () => {
    expect(csvToWeekdays('5,1,1,9,x')).toEqual([1, 5]);
    expect(describeSchedule(s({ type: 'weekdays', weekdays: [1, 2, 3, 4, 5] }))).toMatch(/School/);
    expect(describeSchedule(s({ type: 'weekdays', weekdays: [0, 6] }))).toBe('Weekends');
  });
});
