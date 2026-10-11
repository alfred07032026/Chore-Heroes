import { addChild, addReward, at } from '../../test-utils/fixtures';
import { createMigratedDb } from '../../test-utils/nodeDb';
import { adjustStars, getBalance, getLedger } from './ledger';
import { approveRedemption, getShop, rejectRedemption, requestReward } from './rewards';
import { countInbox, getInbox } from './approvals';

describe('rewards & redemptions', () => {
  it('debits on request, blocks negative balances', async () => {
    const db = await createMigratedDb();
    const child = await addChild(db);
    const reward = await addReward(db, { cost: 10 });
    expect(await requestReward(db, child.id, reward.id, at(2026, 10, 11))).toMatchObject({
      kind: 'blocked',
      check: { reason: 'insufficient_stars', missing: 10 },
    });
    await adjustStars(db, child.id, 12, 'Starting bonus', at(2026, 10, 11));
    const r = await requestReward(db, child.id, reward.id, at(2026, 10, 11));
    expect(r.kind).toBe('requested');
    expect(await getBalance(db, child.id)).toBe(2);
    // Cannot double-spend the same stars
    expect((await requestReward(db, child.id, reward.id, at(2026, 10, 11))).kind).toBe('blocked');
    const ledger = await getLedger(db, child.id);
    expect(ledger[0]).toMatchObject({
      delta: -10,
      reason: 'Reward: Pick the movie',
      sourceType: 'redemption',
    });
  });

  it('refunds on rejection and keeps stars spent on approval', async () => {
    const db = await createMigratedDb();
    const child = await addChild(db);
    const reward = await addReward(db, { cost: 5 });
    await adjustStars(db, child.id, 10, 'Bonus', at(2026, 10, 11));
    const a = await requestReward(db, child.id, reward.id, at(2026, 10, 11));
    const b = await requestReward(db, child.id, reward.id, at(2026, 10, 11));
    expect(await countInbox(db)).toBe(2);
    if (a.kind !== 'requested' || b.kind !== 'requested') throw new Error('expected requests');
    expect((await approveRedemption(db, a.redemption.id, 'Enjoy!', at(2026, 10, 11))).ok).toBe(
      true,
    );
    expect(await rejectRedemption(db, b.redemption.id, null, at(2026, 10, 11))).toBe(true);
    expect(await rejectRedemption(db, b.redemption.id, null, at(2026, 10, 11))).toBe(false); // no double refund
    expect(await getBalance(db, child.id)).toBe(5);
    expect(await getInbox(db)).toHaveLength(0);
  });

  it('redeems instantly when approval is off', async () => {
    const db = await createMigratedDb();
    const child = await addChild(db);
    const reward = await addReward(db, { cost: 3, needsApproval: false });
    await adjustStars(db, child.id, 3, 'Bonus', at(2026, 10, 11));
    const r = await requestReward(db, child.id, reward.id, at(2026, 10, 11));
    expect(r).toMatchObject({ kind: 'redeemed', newBadges: ['first_reward'] });
    expect(await getBalance(db, child.id)).toBe(0);
    expect(await countInbox(db)).toBe(0);
  });

  it('enforces the per-week limit and resets it next week', async () => {
    const db = await createMigratedDb();
    const child = await addChild(db);
    const reward = await addReward(db, { cost: 1, weeklyLimit: 2, needsApproval: false });
    await adjustStars(db, child.id, 10, 'Bonus', at(2026, 10, 5));
    expect((await requestReward(db, child.id, reward.id, at(2026, 10, 5))).kind).toBe('redeemed');
    expect((await requestReward(db, child.id, reward.id, at(2026, 10, 9))).kind).toBe('redeemed');
    expect(await requestReward(db, child.id, reward.id, at(2026, 10, 11, 23, 59))).toMatchObject({
      kind: 'blocked',
      check: { reason: 'weekly_limit_reached' },
    });
    const shop = await getShop(db, child.id, '2026-10-11');
    expect(shop.items[0]).toMatchObject({ limitReached: true });
    expect((await requestReward(db, child.id, reward.id, at(2026, 10, 12, 0, 1))).kind).toBe(
      'redeemed',
    );
  });

  it('a rejected request frees up the weekly slot', async () => {
    const db = await createMigratedDb();
    const child = await addChild(db);
    const reward = await addReward(db, { cost: 1, weeklyLimit: 1 });
    await adjustStars(db, child.id, 10, 'Bonus', at(2026, 10, 5));
    const r = await requestReward(db, child.id, reward.id, at(2026, 10, 5));
    if (r.kind !== 'requested') throw new Error('expected request');
    await rejectRedemption(db, r.redemption.id, null, at(2026, 10, 5));
    expect((await requestReward(db, child.id, reward.id, at(2026, 10, 6))).kind).toBe('requested');
  });

  it('shop marks affordable rewards', async () => {
    const db = await createMigratedDb();
    const child = await addChild(db);
    await addReward(db, { title: 'Small', cost: 2 });
    await addReward(db, { title: 'Big', cost: 20 });
    await adjustStars(db, child.id, 5, 'Bonus', at(2026, 10, 11));
    const shop = await getShop(db, child.id, '2026-10-11');
    expect(shop.balance).toBe(5);
    expect(shop.items.map((i) => [i.reward.title, i.affordable, i.missing])).toEqual([
      ['Small', true, 0],
      ['Big', false, 15],
    ]);
  });
});
