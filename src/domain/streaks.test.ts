import { computeStreak, streakMessage } from './streaks';

describe('streaks', () => {
  it('counts consecutive days ending today', () => {
    const s = computeStreak(['2026-10-09', '2026-10-10', '2026-10-11'], '2026-10-11');
    expect(s).toMatchObject({ current: 3, best: 3, todayDone: true });
  });

  it('keeps the streak alive until today is over', () => {
    const s = computeStreak(['2026-10-09', '2026-10-10'], '2026-10-11');
    expect(s).toMatchObject({ current: 2, todayDone: false });
  });

  it('resets gently after a missed day', () => {
    const s = computeStreak(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-09'], '2026-10-11');
    expect(s.current).toBe(0);
    expect(s.best).toBe(3);
    expect(s.restarting).toBe(true);
    const msg = streakMessage(s, 'Maya');
    expect(msg).toMatch(/Welcome back/);
    expect(msg).not.toMatch(/lost|fail|broke/i);
  });

  it('ignores future dates and duplicates', () => {
    expect(computeStreak(['2026-10-12', '2026-10-11', '2026-10-11'], '2026-10-11').current).toBe(1);
    expect(computeStreak([], '2026-10-11')).toMatchObject({
      current: 0,
      best: 0,
      restarting: false,
    });
  });
});
