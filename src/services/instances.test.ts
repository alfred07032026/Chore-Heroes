import { addChild, addTask, at } from '../../test-utils/fixtures';
import { createMigratedDb } from '../../test-utils/nodeDb';
import { getBalance, getLedger } from './ledger';
import {
  backfillAll,
  completeInstance,
  ensureInstances,
  getToday,
  undoInstance,
} from './instances';
import { archiveTask, updateTask } from './tasks';

describe('task instances & check-off', () => {
  it('creates one instance per day and awards stars once', async () => {
    const db = await createMigratedDb();
    const child = await addChild(db);
    await addTask(db, [child.id]);
    const now = at(2026, 10, 11, 8);

    const board = await getToday(db, child.id, '2026-10-11', now);
    expect(board.todo).toHaveLength(1);
    const inst = board.todo[0]!;

    expect(await completeInstance(db, inst.id, now)).toMatchObject({ kind: 'done', stars: 3 });
    expect(await completeInstance(db, inst.id, now)).toEqual({ kind: 'already' });
    expect(await getBalance(db, child.id)).toBe(3);

    // Re-running generation the same day never duplicates
    await ensureInstances(db, { from: '2026-10-11', to: '2026-10-11' }, child.id, now);
    const again = await getToday(db, child.id, '2026-10-11', now);
    expect(again.todo).toHaveLength(0);
    expect(again.done).toHaveLength(1);

    const ledger = await getLedger(db, child.id);
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({
      delta: 3,
      reason: 'Task: Feed the dog',
      sourceType: 'task_instance',
      sourceId: inst.id,
    });
  });

  it('rolls over at local midnight: a new instance for the new day, history kept', async () => {
    const db = await createMigratedDb();
    const child = await addChild(db);
    await addTask(db, [child.id]);
    const late = at(2026, 10, 11, 23, 58);
    const day1 = await getToday(db, child.id, '2026-10-11', late);
    await completeInstance(db, day1.todo[0]!.id, late);

    const early = at(2026, 10, 12, 0, 1);
    const day2 = await getToday(db, child.id, '2026-10-12', early);
    expect(day2.todo).toHaveLength(1);
    expect(day2.done).toHaveLength(0);
    expect(day2.todo[0]!.id).not.toBe(day1.todo[0]!.id);

    const n = await db.get<{ n: number }>('SELECT COUNT(*) AS n FROM task_instances');
    expect(n?.n).toBe(2);
  });

  it('refuses to complete yesterday’s instance after midnight', async () => {
    const db = await createMigratedDb();
    const child = await addChild(db);
    await addTask(db, [child.id]);
    const day1 = await getToday(db, child.id, '2026-10-11', at(2026, 10, 11, 20));
    // Screen left open past midnight, then tapped:
    expect(await completeInstance(db, day1.todo[0]!.id, at(2026, 10, 12, 0, 5))).toEqual({
      kind: 'expired',
    });
    expect(await getBalance(db, child.id)).toBe(0);
  });

  it('weekly tasks can only be completed once per week', async () => {
    const db = await createMigratedDb();
    const child = await addChild(db);
    await addTask(db, [child.id], { scheduleType: 'weekly', title: 'Clean room' });
    const mon = await getToday(db, child.id, '2026-10-05', at(2026, 10, 5));
    await completeInstance(db, mon.todo[0]!.id, at(2026, 10, 5));
    const wed = await getToday(db, child.id, '2026-10-07', at(2026, 10, 7));
    expect(wed.todo).toHaveLength(0);
    expect(wed.done).toHaveLength(0); // finished on Monday, not shown on Wednesday
    const nextMon = await getToday(db, child.id, '2026-10-12', at(2026, 10, 12));
    expect(nextMon.todo).toHaveLength(1);
  });

  it('weekday tasks only appear on chosen days', async () => {
    const db = await createMigratedDb();
    const child = await addChild(db);
    await addTask(db, [child.id], { scheduleType: 'weekdays', weekdays: [1] }); // Mondays
    expect((await getToday(db, child.id, '2026-10-05', at(2026, 10, 5))).todo).toHaveLength(1);
    expect((await getToday(db, child.id, '2026-10-06', at(2026, 10, 6))).todo).toHaveLength(0);
  });

  it('approval tasks wait and do not award stars yet', async () => {
    const db = await createMigratedDb();
    const child = await addChild(db);
    await addTask(db, [child.id], { needsApproval: true });
    const now = at(2026, 10, 11);
    const board = await getToday(db, child.id, '2026-10-11', now);
    expect(await completeInstance(db, board.todo[0]!.id, now)).toEqual({ kind: 'waiting' });
    expect(await getBalance(db, child.id)).toBe(0);
    const after = await getToday(db, child.id, '2026-10-11', now);
    expect(after.waiting).toHaveLength(1);
  });

  it('lets a child undo an accidental check-off with a compensating ledger row', async () => {
    const db = await createMigratedDb();
    const child = await addChild(db);
    await addTask(db, [child.id]);
    const now = at(2026, 10, 11);
    const id = (await getToday(db, child.id, '2026-10-11', now)).todo[0]!.id;
    await completeInstance(db, id, now);
    expect(await undoInstance(db, id, now)).toEqual({ kind: 'undone' });
    expect(await getBalance(db, child.id)).toBe(0);
    const rows = await getLedger(db, child.id);
    expect(rows.map((r) => r.delta).sort()).toEqual([-3, 3]);
    expect((await getToday(db, child.id, '2026-10-11', now)).todo).toHaveLength(1);
    // Undo is not allowed on another day
    await completeInstance(db, id, now);
    expect(await undoInstance(db, id, at(2026, 10, 12))).toEqual({ kind: 'too_late' });
  });

  it('editing a task never rewrites completed history', async () => {
    const db = await createMigratedDb();
    const child = await addChild(db);
    const task = await addTask(db, [child.id]);
    const d1 = at(2026, 10, 10);
    const i1 = (await getToday(db, child.id, '2026-10-10', d1)).todo[0]!;
    await completeInstance(db, i1.id, d1);

    const d2 = at(2026, 10, 11);
    await getToday(db, child.id, '2026-10-11', d2);
    await updateTask(db, task.id, { ...task, title: 'Feed the cat', stars: 5 }, d2);
    const board = await getToday(db, child.id, '2026-10-11', d2);
    expect(board.todo[0]).toMatchObject({ title: 'Feed the cat', stars: 5 });
    const old = await db.get<{ title: string; stars: number }>(
      'SELECT title, stars FROM task_instances WHERE id = ?',
      [i1.id],
    );
    expect(old).toEqual({ title: 'Feed the dog', stars: 3 });
  });

  it('archived tasks disappear from Today but keep history', async () => {
    const db = await createMigratedDb();
    const child = await addChild(db);
    const task = await addTask(db, [child.id]);
    const now = at(2026, 10, 11);
    const id = (await getToday(db, child.id, '2026-10-11', now)).todo[0]!.id;
    await completeInstance(db, id, now);
    await archiveTask(db, task.id, now);
    const board = await getToday(db, child.id, '2026-10-12', at(2026, 10, 12));
    expect(board.todo).toHaveLength(0);
    expect(await getBalance(db, child.id)).toBe(3);
  });

  it('back-fills missed days for stats', async () => {
    const db = await createMigratedDb();
    const child = await addChild(db);
    await addTask(db, [child.id], { startDate: '2026-10-05' });
    expect(await backfillAll(db, '2026-10-11', at(2026, 10, 11))).toBe(7);
    expect(await backfillAll(db, '2026-10-11', at(2026, 10, 11))).toBe(0);
  });

  it('serializes concurrent double-taps', async () => {
    const db = await createMigratedDb();
    const child = await addChild(db);
    await addTask(db, [child.id]);
    const now = at(2026, 10, 11);
    const id = (await getToday(db, child.id, '2026-10-11', now)).todo[0]!.id;
    const results = await Promise.all([
      completeInstance(db, id, now),
      completeInstance(db, id, now),
    ]);
    expect(results.filter((r) => r.kind === 'done')).toHaveLength(1);
    expect(await getBalance(db, child.id)).toBe(3);
  });
});

describe('schedule changes', () => {
  it('switching a finished daily job to weekly the same day does not let it be earned again', async () => {
    const db = await createMigratedDb();
    const child = await addChild(db);
    const task = await addTask(db, [child.id]);
    const now = at(2026, 10, 7, 9); // Wednesday
    const id = (await getToday(db, child.id, '2026-10-07', now)).todo[0]!.id;
    await completeInstance(db, id, now);
    await updateTask(db, task.id, { ...task, scheduleType: 'weekly' }, at(2026, 10, 7, 10));
    const sameDay = await getToday(db, child.id, '2026-10-07', at(2026, 10, 7, 11));
    expect(sameDay.todo).toHaveLength(0);
    // Later in the same week: still done for this week
    expect((await getToday(db, child.id, '2026-10-09', at(2026, 10, 9))).todo).toHaveLength(0);
    // Next week it's back
    expect((await getToday(db, child.id, '2026-10-12', at(2026, 10, 12))).todo).toHaveLength(1);
    expect(await getBalance(db, child.id)).toBe(3);
  });

  it('a schedule change applies from today (start date moves forward)', async () => {
    const db = await createMigratedDb();
    const child = await addChild(db);
    const task = await addTask(db, [child.id]);
    const updated = await updateTask(
      db,
      task.id,
      { ...task, scheduleType: 'once' },
      at(2026, 10, 7),
    );
    expect(updated.startDate).toBe('2026-10-07');
  });

  it('switching weekly to daily mid-week offers the daily job on later days', async () => {
    const db = await createMigratedDb();
    const child = await addChild(db);
    const task = await addTask(db, [child.id], { scheduleType: 'weekly' });
    const mon = await getToday(db, child.id, '2026-10-05', at(2026, 10, 5));
    await completeInstance(db, mon.todo[0]!.id, at(2026, 10, 5));
    await updateTask(db, task.id, { ...task, scheduleType: 'daily' }, at(2026, 10, 7));
    expect((await getToday(db, child.id, '2026-10-07', at(2026, 10, 7))).todo).toHaveLength(1);
  });
});
