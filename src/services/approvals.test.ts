import { addChild, addTask, at } from '../../test-utils/fixtures';
import { createMigratedDb } from '../../test-utils/nodeDb';
import { approveTask, getInbox, rejectTask } from './approvals';
import { completeInstance, getToday } from './instances';
import { adjustStars, getBalance, getLedger } from './ledger';
import { DomainError } from './errors';

describe('approvals', () => {
  it('approving credits stars once and attaches the note', async () => {
    const db = await createMigratedDb();
    const child = await addChild(db);
    await addTask(db, [child.id], { needsApproval: true, stars: 4 });
    const now = at(2026, 10, 11);
    const id = (await getToday(db, child.id, '2026-10-11', now)).todo[0]!.id;
    await completeInstance(db, id, now);

    const inbox = await getInbox(db);
    expect(inbox).toHaveLength(1);
    expect(inbox[0]).toMatchObject({ kind: 'task', child: { name: 'Maya' } });

    expect(await approveTask(db, id, 'Nice job!', now)).toMatchObject({
      ok: true,
      newBadges: ['first_task'],
    });
    expect(await approveTask(db, id, 'Nice job!', now)).toMatchObject({ ok: false });
    expect(await getBalance(db, child.id)).toBe(4);
    const board = await getToday(db, child.id, '2026-10-11', now);
    expect(board.done[0]).toMatchObject({ parentNote: 'Nice job!' });
  });

  it('approval of yesterday’s job is credited on the approval date', async () => {
    const db = await createMigratedDb();
    const child = await addChild(db);
    await addTask(db, [child.id], { needsApproval: true });
    const id = (await getToday(db, child.id, '2026-10-10', at(2026, 10, 10, 19))).todo[0]!.id;
    await completeInstance(db, id, at(2026, 10, 10, 19));
    await approveTask(db, id, null, at(2026, 10, 11, 7));
    const [entry] = await getLedger(db, child.id);
    expect(entry?.localDate).toBe('2026-10-11');
    // Still counts toward the streak on the day it was done
    const row = await db.get<{ completed_date: string }>(
      'SELECT completed_date FROM task_instances WHERE id = ?',
      [id],
    );
    expect(row?.completed_date).toBe('2026-10-10');
  });

  it('rejecting sends the job back with an encouraging note', async () => {
    const db = await createMigratedDb();
    const child = await addChild(db);
    await addTask(db, [child.id], { needsApproval: true });
    const now = at(2026, 10, 11);
    const id = (await getToday(db, child.id, '2026-10-11', now)).todo[0]!.id;
    await completeInstance(db, id, now);
    expect(await rejectTask(db, id, null, now)).toBe(true);
    const board = await getToday(db, child.id, '2026-10-11', now);
    expect(board.todo[0]).toMatchObject({
      returned: true,
      parentNote: "Let's try that one again!",
    });
    expect(await getBalance(db, child.id)).toBe(0);
    // Child can try again
    expect(await completeInstance(db, id, now)).toEqual({ kind: 'waiting' });
  });

  it('manual adjustments need a reason and cannot go negative', async () => {
    const db = await createMigratedDb();
    const child = await addChild(db);
    await expect(adjustStars(db, child.id, 5, '  ', at(2026, 10, 11))).rejects.toBeInstanceOf(
      DomainError,
    );
    await expect(adjustStars(db, child.id, -1, 'Oops', at(2026, 10, 11))).rejects.toThrow(
      /would_go_negative/,
    );
    expect(await adjustStars(db, child.id, 5, 'Helped grandma', at(2026, 10, 11))).toBe(5);
    expect((await getLedger(db, child.id))[0]).toMatchObject({
      reason: 'Adjustment: Helped grandma',
      sourceType: 'adjustment',
    });
  });
});
