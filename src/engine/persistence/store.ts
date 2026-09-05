import type { CubeSet, PartOfSpeech } from '../types';
import { EMPTY_RECORDS, type RecordBook } from '../stats/records';
import type { RollLog } from '../stats/stats';

/**
 * Local persistence.
 *
 * Behind an interface so a club account can swap in a remote store later
 * without the UI changing. Everything lives in this browser; nothing is
 * uploaded.
 */
export interface Settings {
  cubeSetId: string;
  customCubeSet?: CubeSet;
  /** The drill setup to open with — what the player last used. */
  types: PartOfSpeech[];
  seconds: number;
  /** How many missed words the results screen lists. */
  showMissedLimit: number;
}

export interface StoredData {
  version: 2;
  settings: Settings;
  rolls: RollLog[];
  records: RecordBook;
}

export const DEFAULT_SETTINGS: Settings = {
  cubeSetId: 'approximate-2026',
  types: ['noun'],
  seconds: 60,
  showMissedLimit: 60,
};

const KEY = 'ling-trainer:v2';
const MAX_ROLLS = 3000;

export interface Store {
  load(): StoredData;
  save(data: StoredData): void;
  clear(): void;
}

function freshData(): StoredData {
  return { version: 2, settings: { ...DEFAULT_SETTINGS }, rolls: [], records: EMPTY_RECORDS };
}

export function createLocalStore(storage: Storage | undefined = globalThis.localStorage): Store {
  return {
    load() {
      if (!storage) return freshData();
      try {
        const raw = storage.getItem(KEY);
        if (!raw) return freshData();
        const parsed = JSON.parse(raw) as StoredData;
        if (parsed.version !== 2) return freshData();
        return {
          ...freshData(),
          ...parsed,
          settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
          records: { ...EMPTY_RECORDS, ...parsed.records, mostWords: { ...parsed.records?.mostWords } },
        };
      } catch {
        return freshData();
      }
    },
    save(data) {
      if (!storage) return;
      const trimmed: StoredData = { ...data, rolls: data.rolls.slice(-MAX_ROLLS) };
      try {
        storage.setItem(KEY, JSON.stringify(trimmed));
      } catch {
        // Quota exceeded: keep the most recent half and try once more. Training
        // must never be blocked by storage.
        try {
          storage.setItem(KEY, JSON.stringify({ ...trimmed, rolls: trimmed.rolls.slice(-Math.floor(MAX_ROLLS / 4)) }));
        } catch {
          /* give up silently */
        }
      }
    },
    clear() {
      storage?.removeItem(KEY);
    },
  };
}
