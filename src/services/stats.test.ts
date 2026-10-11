import { addChild, addTask, at } from '../../test-utils/fixtures';
import { createMigratedDb } from '../../test-utils/nodeDb';
import { listEarnedBadges, markBadgesSeen, unseenBadges } from './badges';
import { backfillAll, completeInstance, getToday } from './instances';
import { getChildDashboard } from './stats';

async function doDay(
  db: Awaited<ReturnType<typeof createMigratedDb>>,
  childId: string,
  day: number,
) {
  const key = `2026-10-${String(day).padStart(2, '0')}`;
  const now = at(2026, 10, day, 18);
  const board = await getToday(db, childId, key, now);
  const results = [];
  for (const i of board.todo) results.push(await completeInstance(db, i.id, now));
  return results;
}

describe('dashboard, streaks and badges', () => {
  it('builds the weekly dashboard', async () => {
    const db = await createMigratedDb();
    const child = await addChild(db);
    await addTask(db, [child.id], { stars: 2 });
    await addTask(db, [child.id], { title: 'Make bed', stars: 1, startDate: '2026-10-05' });
    await doDay(db, child.id, 5);
    await doDay(db, child.id, 6);
    await backfillAll(db, '2026-10-08', at(2026, 10, 8));
    const d = await getChildDashboard(db, child.id, '2026-10-08');
    expect(d.week.map((w) => w.stars)).toEqual([3, 3, 0, 0, 0, 0, 0]);
    expect(d.starsThisWeek).toBe(6);
    expect(d.balance).toBe(6);
    expect(d.dueThisWeek).toBe(8); // 2 tasks × 4 days (Mon–Thu)
    expect(d.doneThisWeek).toBe(4);
    expect(d.completionRate).toBe(0.5);
    expect(d.streak).toMatchObject({ current: 0, best: 2 });
  });

  it('awards badges once, including perfect day and streaks', async () => {
    const db = await createMigratedDb();
    const child = await addChild(db);
    await addTask(db, [child.id]);
    await addTask(db, [child.id], { title: 'Make bed', stars: 1 });
    const r1 = await doDay(db, child.id, 1);
    const firstDay = r1.flatMap((r) => (r.kind === 'done' ? r.newBadges : []));
    expect(firstDay).toEqual(expect.arrayContaining(['first_task', 'perfect_day']));
    await doDay(db, child.id, 2);
    const r3 = await doDay(db, child.id, 3);
    expect(r3.flatMap((r) => (r.kind === 'done' ? r.newBadges : []))).toContain('streak_3');

    const earned = await listEarnedBadges(db, child.id);
    expect(new Set(earned.map((e) => e.badgeId)).size).toBe(earned.length);
    expect((await unseenBadges(db, child.id)).length).toBe(earned.length);
    await markBadgesSeen(db, child.id, ['first_task']);
    expect(await unseenBadges(db, child.id)).not.toContain('first_task');
  });
});
