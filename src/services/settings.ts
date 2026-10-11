import { hashPin, isValidPin, lockoutMs, makeSalt, verifyPin } from '@/domain/security';
import type { Db, DbExecutor } from '@/db/types';

import { DomainError } from './errors';

export interface AppSettings {
  soundOn: boolean;
  voiceOn: boolean;
  /** App-level reduce motion (the OS setting is always respected in addition). */
  reduceMotion: boolean;
  dyslexicFont: boolean;
  reminderOn: boolean;
  reminderHour: number;
  reminderMinute: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  soundOn: true,
  voiceOn: true,
  reduceMotion: false,
  dyslexicFont: false,
  reminderOn: false,
  reminderHour: 17,
  reminderMinute: 0,
};

const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS) as (keyof AppSettings)[];

async function readRaw(db: DbExecutor, key: string): Promise<unknown> {
  const row = await db.get<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
  if (!row) return undefined;
  try {
    return JSON.parse(row.value);
  } catch {
    return undefined;
  }
}

async function writeRaw(db: DbExecutor, key: string, value: unknown): Promise<void> {
  await db.run(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    [key, JSON.stringify(value)],
  );
}

export async function loadSettings(db: DbExecutor): Promise<AppSettings> {
  const out: AppSettings = { ...DEFAULT_SETTINGS };
  for (const key of SETTING_KEYS) {
    const v = await readRaw(db, key);
    if (typeof v === typeof DEFAULT_SETTINGS[key])
      (out as unknown as Record<string, unknown>)[key] = v;
  }
  return out;
}

export async function saveSetting<K extends keyof AppSettings>(
  db: DbExecutor,
  key: K,
  value: AppSettings[K],
) {
  await writeRaw(db, key, value);
}

export async function isSetupComplete(db: DbExecutor): Promise<boolean> {
  const [done, pin] = await Promise.all([readRaw(db, 'setupComplete'), readRaw(db, 'pinHash')]);
  return done === true && typeof pin === 'string';
}

export async function markSetupComplete(db: DbExecutor): Promise<void> {
  await writeRaw(db, 'setupComplete', true);
}

export async function hasPin(db: DbExecutor): Promise<boolean> {
  return typeof (await readRaw(db, 'pinHash')) === 'string';
}

export async function setPin(db: Db, pin: string): Promise<void> {
  if (!isValidPin(pin)) throw new DomainError('invalid_pin', 'PIN must be 4 digits.');
  const salt = makeSalt();
  await db.transaction(async (tx) => {
    await writeRaw(tx, 'pinSalt', salt);
    await writeRaw(tx, 'pinHash', hashPin(pin, salt));
    await writeRaw(tx, 'pinFailures', 0);
    await writeRaw(tx, 'pinLockedUntil', 0);
  });
}

export type PinCheck = { ok: true } | { ok: false; lockedForMs: number; attemptsLeft: number };

/** Verifies the PIN with persistent lockout (survives app restarts so a child can't just relaunch). */
export async function checkPin(db: Db, pin: string, now = new Date()): Promise<PinCheck> {
  return db.transaction(async (tx) => {
    const lockedUntil = Number((await readRaw(tx, 'pinLockedUntil')) ?? 0);
    if (lockedUntil > now.getTime()) {
      return { ok: false, lockedForMs: lockedUntil - now.getTime(), attemptsLeft: 0 };
    }
    const salt = await readRaw(tx, 'pinSalt');
    const hash = await readRaw(tx, 'pinHash');
    if (typeof salt === 'string' && typeof hash === 'string' && verifyPin(pin, salt, hash)) {
      await writeRaw(tx, 'pinFailures', 0);
      return { ok: true };
    }
    const failures = Number((await readRaw(tx, 'pinFailures')) ?? 0) + 1;
    await writeRaw(tx, 'pinFailures', failures);
    const lock = lockoutMs(failures);
    if (lock > 0) await writeRaw(tx, 'pinLockedUntil', now.getTime() + lock);
    return { ok: false, lockedForMs: lock, attemptsLeft: Math.max(0, 5 - failures) };
  });
}

export async function pinLockRemaining(db: DbExecutor, now = new Date()): Promise<number> {
  const lockedUntil = Number((await readRaw(db, 'pinLockedUntil')) ?? 0);
  return Math.max(0, lockedUntil - now.getTime());
}
