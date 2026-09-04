import type { CubeSet } from '../types';
import type { RecordBook } from '../stats/records';
import type { SessionLog, ShakeLog } from '../stats/stats';

/**
 * Local persistence.
 *
 * Deliberately behind an interface with a namespaced key: when club accounts
 * arrive, a remote store implements the same shape and the UI does not change.
 * Everything is keyed by a profile id so one device can hold several players.
 */
export interface Profile {
  id: string;
  name: string;
  createdAt: number;
}

export interface Settings {
  /** Cube set id, or 'custom'. */
  cubeSetId: string;
  customCubeSet?: CubeSet;
  soundCues: boolean;
  showAnswerKeyLimit: number;
  reduceMotion: boolean;
}

export interface StoredData {
  version: 1;
  profile: Profile;
  settings: Settings;
  shakes: ShakeLog[];
  sessions: SessionLog[];
  records: RecordBook;
}

export const DEFAULT_SETTINGS: Settings = {
  cubeSetId: 'approximate-2026',
  soundCues: false,
  showAnswerKeyLimit: 40,
  reduceMotion: false,
};

const KEY = 'ling-trainer:v1';
const MAX_SHAKES = 4000;
const MAX_SESSIONS = 400;

export interface Store {
  load(): StoredData;
  save(data: StoredData): void;
  clear(): void;
}

function freshData(): StoredData {
  return {
    version: 1,
    profile: { id: 'local', name: 'Player', createdAt: Date.now() },
    settings: { ...DEFAULT_SETTINGS },
    shakes: [],
    sessions: [],
    records: {},
  };
}

export function createLocalStore(storage: Storage | undefined = globalThis.localStorage): Store {
  return {
    load() {
      if (!storage) return freshData();
      try {
        const raw = storage.getItem(KEY);
        if (!raw) return freshData();
        const parsed = JSON.parse(raw) as StoredData;
        if (parsed.version !== 1) return freshData();
        return { ...freshData(), ...parsed, settings: { ...DEFAULT_SETTINGS, ...parsed.settings } };
      } catch {
        return freshData();
      }
    },
    save(data) {
      if (!storage) return;
      const trimmed: StoredData = {
        ...data,
        shakes: data.shakes.slice(-MAX_SHAKES),
        sessions: data.sessions.slice(-MAX_SESSIONS),
      };
      try {
        storage.setItem(KEY, JSON.stringify(trimmed));
      } catch {
        // Quota exceeded: drop the oldest half of the shake log and retry once.
        try {
          storage.setItem(
            KEY,
            JSON.stringify({ ...trimmed, shakes: trimmed.shakes.slice(-Math.floor(MAX_SHAKES / 2)) }),
          );
        } catch {
          /* give up silently: training must never be blocked by storage */
        }
      }
    },
    clear() {
      storage?.removeItem(KEY);
    },
  };
}
