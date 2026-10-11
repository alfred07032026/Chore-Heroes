import { balanceOf, checkAdjustment, checkRedemption, completionRate } from './rules';

describe('rules', () => {
  it('computes balance from ledger rows', () => {
    expect(balanceOf([{ delta: 3 }, { delta: 5 }, { delta: -10 }, { delta: 4 }])).toBe(2);
    expect(balanceOf([])).toBe(0);
  });

  it('blocks redemptions that would go negative', () => {
    expect(checkRedemption({ balance: 9, cost: 10, weeklyLimit: null, usedThisWeek: 0 })).toEqual({
      ok: false,
      reason: 'insufficient_stars',
      missing: 1,
    });
    expect(checkRedemption({ balance: 10, cost: 10, weeklyLimit: null, usedThisWeek: 0 }).ok).toBe(
      true,
    );
  });

  it('enforces weekly limits', () => {
    expect(
      checkRedemption({ balance: 100, cost: 5, weeklyLimit: 2, usedThisWeek: 2 }),
    ).toMatchObject({
      ok: false,
      reason: 'weekly_limit_reached',
    });
    expect(checkRedemption({ balance: 100, cost: 5, weeklyLimit: 2, usedThisWeek: 1 }).ok).toBe(
      true,
    );
  });

  it('requires a reason and non-negative result for adjustments', () => {
    expect(checkAdjustment({ balance: 5, delta: 2, reason: '' })).toMatchObject({
      reason: 'reason_required',
    });
    expect(checkAdjustment({ balance: 5, delta: -6, reason: 'Oops' })).toMatchObject({
      reason: 'would_go_negative',
    });
    expect(checkAdjustment({ balance: 5, delta: 0, reason: 'Oops' })).toMatchObject({
      reason: 'zero_delta',
    });
    expect(checkAdjustment({ balance: 5, delta: 1.5, reason: 'Oops' })).toMatchObject({
      reason: 'zero_delta',
    });
    expect(checkAdjustment({ balance: 5, delta: -5, reason: 'Broke a rule' }).ok).toBe(true);
  });

  it('computes completion rate', () => {
    expect(completionRate(0, 0)).toBeNull();
    expect(completionRate(3, 4)).toBe(0.75);
  });
});
