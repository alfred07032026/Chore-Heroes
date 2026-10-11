import { sha256Hex } from './sha256';

export const PIN_LENGTH = 4;
const HASH_ROUNDS = 2000;

export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

/** Rejects PINs a child could guess instantly (1111, 1234, 4321 …). */
export function isWeakPin(pin: string): boolean {
  if (!isValidPin(pin)) return true;
  if (/^(\d)\1{3}$/.test(pin)) return true;
  const digits = pin.split('').map(Number);
  const steps = digits.slice(1).map((d, i) => d - digits[i]!);
  return steps.every((s) => s === 1) || steps.every((s) => s === -1);
}

export function makeSalt(random: () => number = Math.random): string {
  return Array.from({ length: 16 }, () =>
    Math.floor(random() * 256)
      .toString(16)
      .padStart(2, '0'),
  ).join('');
}

/** Salted, iterated hash. A 4-digit PIN is a child-gate, not strong crypto; this just keeps it out of plain text. */
export function hashPin(pin: string, salt: string): string {
  let h = sha256Hex(`${salt}:${pin}`);
  for (let i = 1; i < HASH_ROUNDS; i++) h = sha256Hex(`${salt}${h}`);
  return h;
}

export function verifyPin(pin: string, salt: string, hash: string): boolean {
  if (!isValidPin(pin)) return false;
  return hashPin(pin, salt) === hash;
}

/** After 5 wrong attempts, lock the keypad for a growing period (30s, 60s, … max 5 min). */
export function lockoutMs(failedAttempts: number): number {
  if (failedAttempts < 5) return 0;
  const tier = failedAttempts - 4;
  return Math.min(5 * 60_000, 30_000 * tier);
}

export interface MathChallenge {
  prompt: string;
  spokenPrompt: string;
  answer: number;
}

/**
 * Parental-gate question: a two-digit × one-digit multiplication (e.g. 17 × 6).
 * Hard for a 6–9 year old to answer by guessing, trivial for an adult.
 */
export function makeMathChallenge(
  random: () => number = Math.random,
  level: 'standard' | 'hard' = 'standard',
): MathChallenge {
  // hard (PIN recovery): two-digit × two-digit, e.g. 27 × 14 — well beyond a 6–9 year old.
  const a = level === 'hard' ? 13 + Math.floor(random() * 17) : 12 + Math.floor(random() * 8);
  const b = level === 'hard' ? 12 + Math.floor(random() * 8) : 3 + Math.floor(random() * 7);
  return { prompt: `${a} × ${b} = ?`, spokenPrompt: `${a} times ${b}`, answer: a * b };
}

export function checkMathAnswer(challenge: MathChallenge, input: string): boolean {
  const n = Number(input.trim());
  return input.trim() !== '' && Number.isInteger(n) && n === challenge.answer;
}
