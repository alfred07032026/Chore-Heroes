import { create } from 'zustand';

import { type DateKey, toDateKey } from '@/domain/dates';
import type { Db } from '@/db/types';
import { DEFAULT_SETTINGS, saveSetting, type AppSettings } from '@/services/settings';

/** Parent mode auto-locks after this long without activity. */
export const PARENT_SESSION_MS = 5 * 60_000;

interface AppState {
  db: Db | null;
  ready: boolean;
  setupComplete: boolean;
  settings: AppSettings;
  systemReduceMotion: boolean;
  /** Bumped after every write; queries re-run when it changes. */
  dataVersion: number;
  today: DateKey;
  parentUnlockedAt: number | null;
  parentLastActive: number;
  /** Settings/export require the extra math gate once per parent session. */
  settingsGatePassed: boolean;
  /** Short app-wide confirmation ("Job saved") shown by the root toast. */
  flash: { id: number; message: string } | null;

  init(db: Db, settings: AppSettings, setupComplete: boolean): void;
  setSetupComplete(v: boolean): void;
  bump(): void;
  setToday(key: DateKey): void;
  setSystemReduceMotion(v: boolean): void;
  updateSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void>;
  replaceSettings(s: AppSettings): void;
  unlockParent(): void;
  touchParent(): void;
  lockParent(): void;
  passSettingsGate(): void;
  showFlash(message: string): void;
  clearFlash(): void;
}

export const useAppStore = create<AppState>((set, get) => ({
  db: null,
  ready: false,
  setupComplete: false,
  settings: DEFAULT_SETTINGS,
  systemReduceMotion: false,
  dataVersion: 0,
  today: toDateKey(new Date()),
  parentUnlockedAt: null,
  parentLastActive: 0,
  settingsGatePassed: false,
  flash: null,

  init: (db, settings, setupComplete) => set({ db, settings, setupComplete, ready: true }),
  setSetupComplete: (setupComplete) => set({ setupComplete }),
  bump: () => set((s) => ({ dataVersion: s.dataVersion + 1 })),
  setToday: (today) => {
    if (get().today !== today) set((s) => ({ today, dataVersion: s.dataVersion + 1 }));
  },
  setSystemReduceMotion: (systemReduceMotion) => set({ systemReduceMotion }),
  updateSetting: async (key, value) => {
    const db = get().db;
    set((s) => ({ settings: { ...s.settings, [key]: value } }));
    if (db) await saveSetting(db, key, value);
  },
  replaceSettings: (settings) => set({ settings }),
  unlockParent: () => set({ parentUnlockedAt: Date.now(), parentLastActive: Date.now() }),
  touchParent: () => set({ parentLastActive: Date.now() }),
  lockParent: () => set({ parentUnlockedAt: null, settingsGatePassed: false }),
  passSettingsGate: () => set({ settingsGatePassed: true }),
  showFlash: (message) => set((s) => ({ flash: { id: (s.flash?.id ?? 0) + 1, message } })),
  clearFlash: () => set({ flash: null }),
}));

export function requireDb(): Db {
  const db = useAppStore.getState().db;
  if (!db) throw new Error('Database not ready');
  return db;
}

/** Run a write, then refresh every screen's data. */
export async function mutate<T>(fn: (db: Db) => Promise<T>): Promise<T> {
  const result = await fn(requireDb());
  useAppStore.getState().bump();
  return result;
}

export function isParentSessionValid(state = useAppStore.getState(), now = Date.now()): boolean {
  return state.parentUnlockedAt !== null && now - state.parentLastActive < PARENT_SESSION_MS;
}

export const useReduceMotion = () =>
  useAppStore((s) => s.settings.reduceMotion || s.systemReduceMotion);
