import { createHash } from 'crypto';

import {
  checkMathAnswer,
  hashPin,
  isValidPin,
  isWeakPin,
  lockoutMs,
  makeMathChallenge,
  verifyPin,
} from './security';
import { sha256Hex } from './sha256';

describe('sha256', () => {
  it('matches known vectors', () => {
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
    expect(sha256Hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')).toBe(
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    );
    expect(sha256Hex('héros ⭐')).toBe(createHash('sha256').update('héros ⭐').digest('hex'));
  });
});

describe('PIN', () => {
  it('validates 4 digits', () => {
    expect(isValidPin('0420')).toBe(true);
    expect(isValidPin('123')).toBe(false);
    expect(isValidPin('12a4')).toBe(false);
  });

  it('flags trivially guessable PINs', () => {
    expect(isWeakPin('1111')).toBe(true);
    expect(isWeakPin('1234')).toBe(true);
    expect(isWeakPin('9876')).toBe(true);
    expect(isWeakPin('2580')).toBe(false);
  });

  it('hashes with salt and verifies', () => {
    const h = hashPin('2580', 'salt1');
    expect(h).not.toContain('2580');
    expect(hashPin('2580', 'salt2')).not.toBe(h);
    expect(verifyPin('2580', 'salt1', h)).toBe(true);
    expect(verifyPin('2581', 'salt1', h)).toBe(false);
  });

  it('locks out after 5 failures with growing delay', () => {
    expect(lockoutMs(4)).toBe(0);
    expect(lockoutMs(5)).toBe(30_000);
    expect(lockoutMs(6)).toBe(60_000);
    expect(lockoutMs(50)).toBe(300_000);
  });
});

describe('math gate', () => {
  it('has a hard level for PIN recovery (two-digit × two-digit)', () => {
    for (const r of [0, 0.5, 0.999]) {
      const c = makeMathChallenge(() => r, 'hard');
      const [a, b] = c.prompt.match(/\d+/g)!.map(Number);
      expect(a).toBeGreaterThanOrEqual(13);
      expect(b).toBeGreaterThanOrEqual(12);
      expect(c.answer).toBe(a! * b!);
    }
  });

  it('creates adult-level questions and checks answers', () => {
    let seed = 0.37;
    const rnd = () => (seed = ((seed * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < 50; i++) {
      const c = makeMathChallenge(rnd);
      expect(c.answer).toBeGreaterThanOrEqual(36);
      expect(checkMathAnswer(c, String(c.answer))).toBe(true);
      expect(checkMathAnswer(c, String(c.answer + 1))).toBe(false);
      expect(checkMathAnswer(c, '')).toBe(false);
    }
  });
});
