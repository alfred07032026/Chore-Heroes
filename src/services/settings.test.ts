import { addChild, at } from '../../test-utils/fixtures';
import { createMigratedDb } from '../../test-utils/nodeDb';
import { adjustStars } from './ledger';
import { exportData, resetAllData } from './backup';
import { archiveChild, createChild, listChildren } from './children';
import {
  checkPin,
  DEFAULT_SETTINGS,
  isSetupComplete,
  loadSettings,
  markSetupComplete,
  saveSetting,
  setPin,
} from './settings';

describe('settings, PIN, children, export & reset', () => {
  it('stores settings with defaults', async () => {
    const db = await createMigratedDb();
    expect(await loadSettings(db)).toEqual(DEFAULT_SETTINGS);
    await saveSetting(db, 'voiceOn', false);
    expect((await loadSettings(db)).voiceOn).toBe(false);
  });

  it('verifies the PIN and locks out after 5 failures (persisted)', async () => {
    const db = await createMigratedDb();
    await setPin(db, '2580');
    const t0 = at(2026, 10, 11, 9);
    expect(await checkPin(db, '2580', t0)).toEqual({ ok: true });
    for (let i = 0; i < 4; i++) expect((await checkPin(db, '0000', t0)).ok).toBe(false);
    const fifth = await checkPin(db, '0000', t0);
    expect(fifth).toMatchObject({ ok: false, lockedForMs: 30_000 });
    // Even the right PIN is refused while locked
    expect((await checkPin(db, '2580', new Date(t0.getTime() + 10_000))).ok).toBe(false);
    expect(await checkPin(db, '2580', new Date(t0.getTime() + 31_000))).toEqual({ ok: true });
  });

  it('tracks first-run setup', async () => {
    const db = await createMigratedDb();
    expect(await isSetupComplete(db)).toBe(false);
    await setPin(db, '2580');
    await markSetupComplete(db);
    expect(await isSetupComplete(db)).toBe(true);
  });

  it('limits children to 1–6 active profiles', async () => {
    const db = await createMigratedDb();
    const first = await addChild(db, 'A');
    await expect(archiveChild(db, first.id)).rejects.toThrow(/At least one/);
    for (const n of ['B', 'C', 'D', 'E', 'F']) await addChild(db, n);
    await expect(addChild(db, 'G')).rejects.toThrow(/up to 6/);
    await expect(
      createChild(db, { name: 'X', avatar: 'cat', age: 12, color: '#000000' }),
    ).rejects.toThrow();
    await archiveChild(db, first.id);
    expect(await listChildren(db)).toHaveLength(5);
    expect(await listChildren(db, true)).toHaveLength(6);
  });

  it('exports everything except PIN secrets, and reset wipes all', async () => {
    const db = await createMigratedDb();
    await setPin(db, '2580');
    const c = await addChild(db);
    await adjustStars(db, c.id, 4, 'Bonus', at(2026, 10, 11));
    const file = await exportData(db, at(2026, 10, 11));
    expect(file.app).toBe('chore-heroes');
    expect(file.tables.children).toHaveLength(1);
    expect(file.tables.stars_ledger).toHaveLength(1);
    expect(JSON.stringify(file)).not.toMatch(/pinHash|pinSalt/);

    await resetAllData(db);
    expect(await listChildren(db, true)).toHaveLength(0);
    expect(await isSetupComplete(db)).toBe(false);
  });
});
