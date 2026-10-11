/** Pure business rules for stars, rewards and adjustments. */

export interface LedgerLike {
  delta: number;
}

export function balanceOf(rows: readonly LedgerLike[]): number {
  return rows.reduce((sum, r) => sum + r.delta, 0);
}

export type RedemptionCheck =
  | { ok: true }
  | { ok: false; reason: 'insufficient_stars'; missing: number }
  | { ok: false; reason: 'weekly_limit_reached'; limit: number };

export function checkRedemption(input: {
  balance: number;
  cost: number;
  weeklyLimit: number | null;
  usedThisWeek: number;
}): RedemptionCheck {
  if (input.weeklyLimit !== null && input.usedThisWeek >= input.weeklyLimit) {
    return { ok: false, reason: 'weekly_limit_reached', limit: input.weeklyLimit };
  }
  if (input.balance - input.cost < 0) {
    return { ok: false, reason: 'insufficient_stars', missing: input.cost - input.balance };
  }
  return { ok: true };
}

export type AdjustmentCheck =
  | { ok: true }
  | { ok: false; reason: 'reason_required' | 'zero_delta' | 'would_go_negative' | 'too_large' };

export const MAX_ADJUSTMENT = 500;

export function checkAdjustment(input: {
  balance: number;
  delta: number;
  reason: string;
}): AdjustmentCheck {
  if (!Number.isInteger(input.delta) || input.delta === 0)
    return { ok: false, reason: 'zero_delta' };
  if (Math.abs(input.delta) > MAX_ADJUSTMENT) return { ok: false, reason: 'too_large' };
  if (input.reason.trim().length < 3) return { ok: false, reason: 'reason_required' };
  if (input.balance + input.delta < 0) return { ok: false, reason: 'would_go_negative' };
  return { ok: true };
}

/** Fraction 0..1 of tasks completed; null when nothing was due. */
export function completionRate(done: number, due: number): number | null {
  if (due <= 0) return null;
  return Math.min(1, done / due);
}
